// Ce service contient la logique principale de gestion des transactions.
// Il est appelé par l’interface React à travers les API ABP.
// Il permet de créer une transaction, vérifier le document, accepter/refuser,
// annuler, gérer le retour et lancer le workflow avec Workflow Core.

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

// Entités des courriers administratifs et judiciaires
using GestionCourrierAbp.Courriers;

// Entité Service
using GestionCourrierAbp.Services;

// Entité Utilisateur
using GestionCourrierAbp.Utilisateurs;

// Classes liées aux statuts et au workflow
using GestionCourrierAbp.Workflows;
using GestionCourrierAbp.Workflows.Transactions;

// BusinessException permet de retourner des erreurs métier
using Volo.Abp;

// DTO ABP pour les listes paginées
using Volo.Abp.Application.Dtos;

// IRepository permet l’accès à la base de données
using Volo.Abp.Domain.Repositories;

// IWorkflowHost permet de lancer un workflow avec Workflow Core
using WorkflowCore.Interface;

namespace GestionCourrierAbp.Transactions;

/// <summary>
/// Service applicatif principal pour gérer les transactions des documents.
/// Il gère la circulation des courriers entre les services.
/// </summary>
public class TransactionWorkflowAppService : GestionCourrierAbpAppService, ITransactionWorkflowAppService
{
    private const int OpeningFilesServiceId = 3;

    // Repository principal pour accéder aux transactions
    private readonly IRepository<Transaction, int> _repository;

    // Repository pour accéder aux courriers administratifs
    private readonly IRepository<CourrierAdministratif, int> _courrierAdministratifRepository;

    // Repository pour accéder aux courriers judiciaires
    private readonly IRepository<CourrierJudiciaire, int> _courrierJudiciaireRepository;

    // Repository pour accéder aux services
    private readonly IRepository<Service, int> _serviceRepository;

    // Repository pour accéder aux utilisateurs
    private readonly IRepository<Utilisateur, int> _utilisateurRepository;

    // Service métier utilisé pour traiter l’acceptation ou le refus d’une transaction
    private readonly TransactionWorkflowService _workflowService;

    // Objet Workflow Core utilisé pour démarrer un workflow
    private readonly IWorkflowHost _workflowHost;

    /// <summary>
    /// Constructeur du service.
    /// Les repositories et services sont injectés automatiquement par ABP.
    /// </summary>
    public TransactionWorkflowAppService(
        IRepository<Transaction, int> repository,
        IRepository<CourrierAdministratif, int> courrierAdministratifRepository,
        IRepository<CourrierJudiciaire, int> courrierJudiciaireRepository,
        IRepository<Service, int> serviceRepository,
        IRepository<Utilisateur, int> utilisateurRepository,
        TransactionWorkflowService workflowService,
        IWorkflowHost workflowHost)
    {
        _repository = repository;
        _courrierAdministratifRepository = courrierAdministratifRepository;
        _courrierJudiciaireRepository = courrierJudiciaireRepository;
        _serviceRepository = serviceRepository;
        _utilisateurRepository = utilisateurRepository;
        _workflowService = workflowService;
        _workflowHost = workflowHost;
    }

    /// <summary>
    /// Récupère la liste paginée de toutes les transactions.
    /// Cette méthode peut être utilisée par l’administration ou pour l’historique global.
    /// </summary>
    public async Task<PagedResultDto<TransactionDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        // Récupération de la requête des transactions
        var query = await _repository.GetQueryableAsync();

        // Comptage du nombre total des transactions
        var totalCount = await AsyncExecuter.CountAsync(query);

        // Récupération des transactions avec pagination
        // Les plus récentes sont affichées en premier
        var items = await AsyncExecuter.ToListAsync(
            query
                .OrderByDescending(x => x.DateEnvoi)
                .Skip(input.SkipCount)
                .Take(input.MaxResultCount));

        // Retourne le résultat sous forme paginée
        var dtoItems = new List<TransactionDto>();
        foreach (var item in items)
        {
            dtoItems.Add(await ToDtoAsync(item));
        }

        return new PagedResultDto<TransactionDto>(totalCount, dtoItems);
    }

    /// <summary>
    /// Récupère les transactions reçues par un service.
    /// On affiche seulement les transactions en attente.
    /// </summary>
    public async Task<ListResultDto<TransactionListDto>> GetIncomingAsync(int destinationServiceId)
    {
        var query = await _repository.GetQueryableAsync();

        // Conversion du statut "EnAttente" vers la valeur stockée en base
        var enAttente = WorkflowStatus.EnAttente.ToStorageValue();

        // Recherche des transactions destinées à ce service et encore en attente
        var transactions = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.DestinationServiceId == destinationServiceId && x.Statut == enAttente)
                .OrderByDescending(x => x.DateEnvoi));

        // Transformation en DTO enrichis pour l’affichage
        return new ListResultDto<TransactionListDto>(
            await ToListDtosAsync(transactions)
        );
    }

    /// <summary>
    /// Récupère les transactions liées au registre d'un service.
    /// On inclut les envois du service et les demandes qu'il a déjà traitées comme destinataire.
    /// </summary>
    public async Task<ListResultDto<TransactionListDto>> GetOutgoingAsync(int sourceServiceId)
    {
        var query = await _repository.GetQueryableAsync();
        var enAttente = WorkflowStatus.EnAttente.ToStorageValue();

        // Le registre doit garder aussi l'historique des décisions prises par le service.
        var transactions = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.SourceServiceId == sourceServiceId ||
                            (x.DestinationServiceId == sourceServiceId && x.Statut != enAttente))
                .OrderByDescending(x => x.DateEnvoi));

        return new ListResultDto<TransactionListDto>(
            await ToListDtosAsync(transactions)
        );
    }

    /// <summary>
    /// Récupère les documents acceptés qui doivent revenir au service source.
    /// Cette méthode aide à suivre les documents en attente de retour.
    /// </summary>
    public async Task<ListResultDto<TransactionListDto>> GetPendingReturnsAsync(int sourceServiceId)
    {
        var query = await _repository.GetQueryableAsync();

        // Statut accepté
        // Recherche des transactions acceptées, envoyées par ce service,
        // et dont le document doit revenir
        var transactions = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.SourceServiceId == sourceServiceId &&
                            x.DoitRevenir &&
                            x.Statut == WorkflowStatus.Accepte.ToStorageValue())
                .OrderByDescending(x => x.DateEnvoi));

        return new ListResultDto<TransactionListDto>(
            await ToListDtosAsync(transactions)
        );
    }

    /// <summary>
    /// Crée une nouvelle transaction.
    /// Cette méthode est appelée lorsqu’un utilisateur envoie un document vers un autre service.
    /// </summary>
    public async Task<TransactionDto> CreateAsync(CreateTransactionDto input)
    {
        // Nettoyage du type de document
        var documentType = input.DocumentType.Trim();

        // Vérifie que le document peut être transmis
        await EnsureDocumentIsTransmissibleAsync(input.DocumentId, documentType, input.DestinationServiceId);
        await EnsureDocumentBelongsToSourceServiceAsync(input.DocumentId, documentType, input.SourceServiceId);

        // Vérifie qu’il n’existe pas déjà une transaction active pour ce document
        await EnsureNoActiveTransactionAsync(input.DocumentId, documentType);

        // Création de la transaction avec le statut initial "En attente"
        var transaction = await _repository.InsertAsync(new Transaction
        {
            DocumentId = input.DocumentId,
            DocumentType = documentType,
            SourceServiceId = input.SourceServiceId,
            DestinationServiceId = input.DestinationServiceId,
            DestinationUserId = input.DestinationUserId,
            DoitRevenir = input.DoitRevenir,
            Message = input.Message?.Trim() ?? string.Empty,
            Statut = WorkflowStatus.EnAttente.ToStorageValue(),
            DateEnvoi = input.DateEnvoi ?? DateTime.Now
        }, autoSave: true);

        await _workflowService.SendDocumentToDestinationServiceAsync(transaction);

        // Lancement du workflow après la création de la transaction
        await _workflowHost.StartWorkflow(
            TransactionLifecycleWorkflow.WorkflowId,
            1,
            new TransactionWorkflowData
            {
                TransactionId = transaction.Id,
                DocumentId = transaction.DocumentId,
                DocumentType = transaction.DocumentType,
                SourceServiceId = transaction.SourceServiceId,
                DestinationServiceId = transaction.DestinationServiceId,
                DoitRevenir = transaction.DoitRevenir,
                Status = WorkflowStatus.EnAttente
            });

        // Retourne la transaction créée sous forme de DTO
        return await ToDtoAsync(transaction);
    }

    /// <summary>
    /// Permet au service destinataire d’accepter ou de refuser une transaction.
    /// </summary>
    public async Task<TransactionDto> RespondAsync(int id, RespondTransactionDto input)
    {
        // Récupération de la transaction par son ID
        var transaction = await _repository.GetAsync(id);

        // Traitement de l’acceptation ou du refus via le service workflow
        await _workflowService.RespondAsync(transaction, input.Accepte, input.Message);

        return await ToDtoAsync(transaction);
    }

    /// <summary>
    /// Permet au service source d’annuler une transaction.
    /// L’annulation est possible seulement si la transaction est encore en attente.
    /// </summary>
    public async Task<TransactionDto> CancelAsync(int id, int sourceServiceId)
    {
        var transaction = await _repository.GetAsync(id);

        // Vérifie que le service qui demande l’annulation est bien le service source
        if (transaction.SourceServiceId != sourceServiceId)
        {
            throw new BusinessException("TransactionAnnulationNonAutorisee");
        }

        // Une transaction ne peut être annulée que si elle est encore en attente
        if (!transaction.Statut.IsSameAs(WorkflowStatus.EnAttente))
        {
            throw new BusinessException("TransactionAnnulationImpossible")
                .WithData("Statut", transaction.Statut);
        }

        // Mise à jour du statut vers "Annulé"
        transaction.Statut = WorkflowStatus.Annule.ToStorageValue();
        transaction.DateReponse = DateTime.Now;
        transaction.MessageReponse = "Annulée par l'émetteur";

        await _workflowService.ReturnDocumentToSourceServiceAsync(transaction);
        await _repository.UpdateAsync(transaction, autoSave: true);

        return await ToDtoAsync(transaction);
    }

    /// <summary>
    /// Marque un document comme retourné au service source.
    /// Cette action est utilisée lorsque le document devait revenir après acceptation.
    /// </summary>
    public async Task<TransactionDto> MarkReturnedAsync(int id, int sourceServiceId)
    {
        var transaction = await _repository.GetAsync(id);

        // Vérifie que seul le service source peut marquer le retour
        if (transaction.SourceServiceId != sourceServiceId)
        {
            throw new BusinessException("TransactionRetourNonAutorise");
        }

        // Vérifie que cette transaction est bien prévue avec retour
        if (!transaction.DoitRevenir)
        {
            throw new BusinessException("TransactionSansRetour");
        }

        // Le retour est possible seulement si la transaction a été acceptée
        if (!transaction.Statut.IsSameAs(WorkflowStatus.Accepte))
        {
            throw new BusinessException("TransactionRetourImpossible")
                .WithData("Statut", transaction.Statut);
        }

        // Le document est considéré comme retourné
        await _workflowService.ReturnDocumentToSourceServiceAsync(transaction);

        transaction.DoitRevenir = false;
        transaction.Statut = WorkflowStatus.Retourne.ToStorageValue();
        transaction.DateReponse = DateTime.Now;
        transaction.MessageReponse = "Document retourne au service source";

        await _repository.UpdateAsync(transaction, autoSave: true);

        return await ToDtoAsync(transaction);
    }

    /// <summary>
    /// Supprime une transaction finalisée.
    /// La suppression est autorisée seulement pour les transactions acceptées ou refusées.
    /// </summary>
    public async Task DeleteAsync(int id, int sourceServiceId, bool isAdmin = false)
    {
        var transaction = await _repository.GetAsync(id);

        // La transaction doit être finalisée avant suppression
        if (!transaction.Statut.IsSameAs(WorkflowStatus.Accepte) &&
            !transaction.Statut.IsSameAs(WorkflowStatus.Refuse))
        {
            throw new BusinessException("TransactionSuppressionImpossible")
                .WithData("Statut", transaction.Statut);
        }

        // Si l’utilisateur n’est pas administrateur,
        // il doit être le service source de la transaction
        if (!isAdmin && transaction.SourceServiceId != sourceServiceId)
        {
            throw new BusinessException("TransactionSuppressionNonAutorisee");
        }

        // Suppression de la transaction
        await _repository.DeleteAsync(transaction, autoSave: true);
    }

    /// <summary>
    /// Vérifie qu’il n’existe pas déjà une transaction active pour le même document.
    /// Une transaction active est une transaction en attente ou acceptée.
    /// </summary>
    private async Task EnsureNoActiveTransactionAsync(int documentId, string documentType)
    {
        var query = await _repository.GetQueryableAsync();

        var enAttente = WorkflowStatus.EnAttente.ToStorageValue();
        // Vérifie si une transaction active existe déjà
        var exists = await AsyncExecuter.AnyAsync(
            query.Where(x =>
                x.DocumentId == documentId &&
                x.DocumentType == documentType &&
                x.Statut == enAttente));

        // Si elle existe, on bloque la création d’une nouvelle transaction
        if (exists)
        {
            throw new BusinessException("DocumentAvecTransactionActive");
        }
    }

    private async Task EnsureDocumentBelongsToSourceServiceAsync(int documentId, string documentType, int sourceServiceId)
    {
        var currentServiceId = await GetCurrentServiceIdAsync(documentId, documentType);
        if (currentServiceId.HasValue && currentServiceId.Value != sourceServiceId)
        {
            throw new BusinessException("DocumentPasDansServiceSource")
                .WithData("CurrentServiceId", currentServiceId.Value)
                .WithData("SourceServiceId", sourceServiceId);
        }
    }

    /// <summary>
    /// Vérifie que le document est transmissible.
    /// Un document non transmissible ne peut pas être envoyé vers un autre service.
    /// </summary>
    private async Task EnsureDocumentIsTransmissibleAsync(int documentId, string documentType, int destinationServiceId)
    {
        if (documentType.Equals("Administratif", StringComparison.OrdinalIgnoreCase))
        {
            var document = await _courrierAdministratifRepository.FindAsync(documentId);
            if (document is not { EstTransmissible: true })
            {
                throw new BusinessException("DocumentNonTransmissible");
            }

            return;
        }

        if (documentType.Equals("Judiciaire", StringComparison.OrdinalIgnoreCase))
        {
            var document = await _courrierJudiciaireRepository.FindAsync(documentId);
            if (document == null)
            {
                throw new BusinessException("DocumentNonTransmissible");
            }

            if (!document.EstTransmissible && destinationServiceId != OpeningFilesServiceId)
            {
                throw new BusinessException("DocumentNonTransmissible");
            }

            return;
        }

        throw new BusinessException("TypeDocumentInvalide")
            .WithData("DocumentType", documentType);
    }
    /// <summary>
    /// Transforme une liste de transactions en DTO enrichis pour l’affichage.
    /// Cette méthode ajoute le sujet du document, le nom des services et le nom de l’utilisateur.
    /// </summary>
    private async Task<List<TransactionListDto>> ToListDtosAsync(List<Transaction> transactions)
    {
        var result = new List<TransactionListDto>();

        foreach (var transaction in transactions)
        {
            var documentInfo = await GetEffectiveDocumentInfoAsync(transaction);

            result.Add(new TransactionListDto
            {
                Id = transaction.Id,
                DocumentId = transaction.DocumentId,
                DocumentType = transaction.DocumentType,

                // Sujet du document concerné
                DocumentSujet = documentInfo.Sujet,
                NumeroCourrier = documentInfo.NumeroCourrier,
                NumeroDossierJudiciaire = documentInfo.NumeroDossierJudiciaire,
                CurrentServiceId = documentInfo.CurrentServiceId,
                CurrentServiceNom = documentInfo.CurrentServiceNom,
                CurrentLocation = documentInfo.CurrentLocation,

                // Service source
                SourceServiceId = transaction.SourceServiceId,
                SourceServiceNom = await GetServiceNameAsync(transaction.SourceServiceId),

                // Service destinataire
                DestinationServiceId = transaction.DestinationServiceId,
                DestinationServiceNom = await GetServiceNameAsync(transaction.DestinationServiceId),

                // Utilisateur destinataire
                DestinationUserId = transaction.DestinationUserId,
                DestinationUserName = await GetUserNameAsync(transaction.DestinationUserId),

                DoitRevenir = transaction.DoitRevenir,
                DateEnvoi = transaction.DateEnvoi,
                DateReponse = transaction.DateReponse,
                Statut = transaction.Statut,
                Message = transaction.Message,
                MessageReponse = transaction.MessageReponse
            });
        }

        return result;
    }

    /// <summary>
    /// Récupère le sujet du document selon son type.
    /// </summary>
    private async Task<DocumentInfo> GetDocumentInfoAsync(int documentId, string documentType)
    {
        if (documentType.Equals("Administratif", StringComparison.OrdinalIgnoreCase))
        {
            var document = await _courrierAdministratifRepository.FindAsync(documentId);
            if (document == null)
            {
                return DocumentInfo.Empty;
            }

            var serviceName = await GetServiceNameAsync(document.ServiceId);
            return new DocumentInfo(
                document.Sujet,
                document.NumeroDeCourrier,
                null,
                document.ServiceId,
                serviceName,
                serviceName);
        }

        if (documentType.Equals("Judiciaire", StringComparison.OrdinalIgnoreCase))
        {
            var document = await _courrierJudiciaireRepository.FindAsync(documentId);
            if (document == null)
            {
                return DocumentInfo.Empty;
            }

            var serviceName = await GetServiceNameAsync(document.ServiceId);
            var location = string.IsNullOrWhiteSpace(document.Emplacement)
                ? serviceName
                : $"{serviceName} - {document.Emplacement}";

            return new DocumentInfo(
                document.Sujet,
                null,
                BuildNumeroDossierJudiciaire(document),
                document.ServiceId,
                serviceName,
                location);
        }

        return DocumentInfo.Empty;
    }

    private async Task<DocumentInfo> GetEffectiveDocumentInfoAsync(Transaction transaction)
    {
        var documentInfo = await GetDocumentInfoAsync(transaction.DocumentId, transaction.DocumentType);
        var effectiveServiceId = GetEffectiveCurrentServiceId(transaction, documentInfo.CurrentServiceId);

        if (!effectiveServiceId.HasValue || effectiveServiceId == documentInfo.CurrentServiceId)
        {
            return documentInfo;
        }

        var serviceName = await GetServiceNameAsync(effectiveServiceId.Value);
        return documentInfo with
        {
            CurrentServiceId = effectiveServiceId,
            CurrentServiceNom = serviceName,
            CurrentLocation = serviceName
        };
    }

    private static int? GetEffectiveCurrentServiceId(Transaction transaction, int? storedServiceId)
    {
        if (transaction.Statut.IsSameAs(WorkflowStatus.EnAttente))
        {
            return transaction.DestinationServiceId;
        }

        if (transaction.Statut.IsSameAs(WorkflowStatus.Refuse) ||
            transaction.Statut.IsSameAs(WorkflowStatus.Annule) ||
            transaction.Statut.IsSameAs(WorkflowStatus.Retourne))
        {
            return transaction.SourceServiceId;
        }

        return storedServiceId;
    }

    private async Task<int?> GetCurrentServiceIdAsync(int documentId, string documentType)
    {
        if (documentType.Equals("Administratif", StringComparison.OrdinalIgnoreCase))
        {
            return (await _courrierAdministratifRepository.FindAsync(documentId))?.ServiceId;
        }

        if (documentType.Equals("Judiciaire", StringComparison.OrdinalIgnoreCase))
        {
            return (await _courrierJudiciaireRepository.FindAsync(documentId))?.ServiceId;
        }

        return null;
    }

    private static string? BuildNumeroDossierJudiciaire(CourrierJudiciaire document)
    {
        if (!document.NumeroDossierAnnee.HasValue &&
            !document.NumeroDossierNombre.HasValue &&
            !document.NumeroDossierSujet.HasValue)
        {
            return null;
        }

        return $"{document.NumeroDossierNombre?.ToString() ?? "-"} / {document.NumeroDossierSujet?.ToString() ?? "-"} / {document.NumeroDossierAnnee?.ToString() ?? "-"}";
    }

    /// <summary>
    /// Récupère le nom du service à partir de son ID.
    /// </summary>
    private async Task<string> GetServiceNameAsync(int serviceId)
    {
        return (await _serviceRepository.FindAsync(serviceId))?.NomService ?? string.Empty;
    }

    /// <summary>
    /// Récupère le nom complet de l’utilisateur destinataire.
    /// Peut retourner null si aucun utilisateur n’est précisé.
    /// </summary>
    private async Task<string?> GetUserNameAsync(int? userId)
    {
        if (!userId.HasValue)
        {
            return null;
        }

        return (await _utilisateurRepository.FindAsync(userId.Value))?.NomComplet;
    }

    /// <summary>
    /// Transforme une entité Transaction en TransactionDto simple.
    /// Cette méthode est utilisée pour retourner les détails de base d’une transaction.
    /// </summary>
    private async Task<TransactionDto> ToDtoAsync(Transaction transaction)
    {
        var documentInfo = await GetEffectiveDocumentInfoAsync(transaction);

        return new TransactionDto
        {
            Id = transaction.Id,
            DocumentId = transaction.DocumentId,
            DocumentType = transaction.DocumentType,
            DocumentSujet = documentInfo.Sujet,
            NumeroCourrier = documentInfo.NumeroCourrier,
            NumeroDossierJudiciaire = documentInfo.NumeroDossierJudiciaire,
            CurrentServiceId = documentInfo.CurrentServiceId,
            CurrentServiceNom = documentInfo.CurrentServiceNom,
            CurrentLocation = documentInfo.CurrentLocation,
            SourceServiceId = transaction.SourceServiceId,
            SourceServiceNom = await GetServiceNameAsync(transaction.SourceServiceId),
            DestinationServiceId = transaction.DestinationServiceId,
            DestinationServiceNom = await GetServiceNameAsync(transaction.DestinationServiceId),
            DestinationUserId = transaction.DestinationUserId,
            DestinationUserName = await GetUserNameAsync(transaction.DestinationUserId),
            DoitRevenir = transaction.DoitRevenir,
            Message = transaction.Message,
            Statut = transaction.Statut,
            DateEnvoi = transaction.DateEnvoi,
            DateReponse = transaction.DateReponse,
            MessageReponse = transaction.MessageReponse,

            // Champs d’audit ABP
            CreationTime = transaction.CreationTime,
            CreatorId = transaction.CreatorId,
            LastModificationTime = transaction.LastModificationTime,
            LastModifierId = transaction.LastModifierId
        };
    }

    private sealed record DocumentInfo(
        string Sujet,
        string? NumeroCourrier,
        string? NumeroDossierJudiciaire,
        int? CurrentServiceId,
        string CurrentServiceNom,
        string CurrentLocation)
    {
        public static DocumentInfo Empty { get; } = new(string.Empty, null, null, null, string.Empty, string.Empty);
    }
}
