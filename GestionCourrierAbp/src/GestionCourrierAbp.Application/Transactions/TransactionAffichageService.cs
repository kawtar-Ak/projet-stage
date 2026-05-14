using System;
using System.Collections.Generic;
using System.Threading.Tasks;

// Importation des entités liées aux courriers administratifs et judiciaires
using GestionCourrierAbp.Courriers;

// Importation de l'entité Service
using GestionCourrierAbp.Services;

// Importation de l'entité Utilisateur
using GestionCourrierAbp.Utilisateurs;
using GestionCourrierAbp.Workflows;

// IRepository permet d'accéder aux données de la base via ABP
using Volo.Abp.Domain.Repositories;

// ITransientDependency permet d'enregistrer automatiquement ce service dans l'injection de dépendances ABP
using Volo.Abp.DependencyInjection;

namespace GestionCourrierAbp.Transactions;

/// <summary>
/// Service responsable de la préparation des données des transactions pour l'affichage.
/// Il transforme les transactions en DTO et ajoute des informations lisibles,
/// comme le sujet du document, le nom du service et le nom de l'utilisateur.
/// </summary>
public class TransactionAffichageService : GestionCourrierAbpAppService, ITransientDependency
{
    // Repository pour accéder aux courriers administratifs
    private readonly IRepository<CourrierAdministratif, int> _courrierAdministratifRepository;

    // Repository pour accéder aux courriers judiciaires
    private readonly IRepository<CourrierJudiciaire, int> _courrierJudiciaireRepository;

    // Repository pour accéder aux services
    private readonly IRepository<Service, int> _serviceRepository;

    // Repository pour accéder aux utilisateurs
    private readonly IRepository<Utilisateur, int> _utilisateurRepository;

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
                document.IdBureauOrdre,
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
                document.IdBureauOrdre,
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
    /// Constructeur du service.
    /// Les repositories sont injectés automatiquement par ABP.
    /// Ils permettent de récupérer les données nécessaires depuis la base de données.
    /// </summary>
    public TransactionAffichageService(
        IRepository<CourrierAdministratif, int> courrierAdministratifRepository,
        IRepository<CourrierJudiciaire, int> courrierJudiciaireRepository,
        IRepository<Service, int> serviceRepository,
        IRepository<Utilisateur, int> utilisateurRepository)
    {
        _courrierAdministratifRepository = courrierAdministratifRepository;
        _courrierJudiciaireRepository = courrierJudiciaireRepository;
        _serviceRepository = serviceRepository;
        _utilisateurRepository = utilisateurRepository;
    }

    /// <summary>
    /// Transforme une entité Transaction en TransactionDto.
    /// Cette méthode copie les informations principales de la transaction.
    /// Elle est utilisée lorsque l'on veut retourner les détails simples d'une transaction.
    /// </summary>
    public TransactionDto ToDto(Transaction transaction)
    {
        return new TransactionDto
        {
            // Identifiant de la transaction
            Id = transaction.Id,

            // Identifiant du document concerné par la transaction
            DocumentId = transaction.DocumentId,

            // Type du document : Administratif ou Judiciaire
            DocumentType = transaction.DocumentType,

            // Service qui a envoyé le document
            SourceServiceId = transaction.SourceServiceId,

            // Service destinataire du document
            DestinationServiceId = transaction.DestinationServiceId,

            // Utilisateur destinataire, s'il existe
            DestinationUserId = transaction.DestinationUserId,

            // Indique si le document doit revenir au service source
            DoitRevenir = transaction.DoitRevenir,

            // Message envoyé avec la transaction
            Message = transaction.Message,

            // Statut de la transaction : En attente, Acceptée, Refusée, etc.
            Statut = transaction.Statut,

            // Date d'envoi de la transaction
            DateEnvoi = transaction.DateEnvoi,

            // Date de réponse : acceptation, refus ou annulation
            DateReponse = transaction.DateReponse,

            // Message de réponse du service destinataire
            MessageReponse = transaction.MessageReponse,

            // Informations d'audit fournies par ABP
            CreationTime = transaction.CreationTime,
            CreatorId = transaction.CreatorId,
            LastModificationTime = transaction.LastModificationTime,
            LastModifierId = transaction.LastModifierId
        };
    }

    /// <summary>
    /// Transforme une liste de transactions en une liste de TransactionListDto.
    /// Cette méthode ajoute des informations lisibles pour l'affichage dans React :
    /// sujet du document, nom du service source, nom du service destinataire,
    /// et nom de l'utilisateur destinataire.
    /// </summary>
    public async Task<List<TransactionListDto>> ToListDtosAsync(List<Transaction> transactions)
    {
        // Liste qui va contenir les transactions transformées
        var result = new List<TransactionListDto>();

        // Parcours de chaque transaction
        foreach (var transaction in transactions)
        {
            var documentInfo = await GetEffectiveDocumentInfoAsync(transaction);

            result.Add(new TransactionListDto
            {
                // Informations principales de la transaction
                Id = transaction.Id,
                DocumentId = transaction.DocumentId,
                DocumentType = transaction.DocumentType,

                // Récupération du sujet du document à partir de son type et de son ID
                DocumentSujet = documentInfo.Subject,
                NumeroBureauOrdre = documentInfo.NumeroBureauOrdre,
                NumeroCourrier = documentInfo.NumeroCourrier,
                NumeroDossierJudiciaire = documentInfo.NumeroDossierJudiciaire,
                CurrentServiceId = documentInfo.CurrentServiceId,
                CurrentServiceNom = documentInfo.CurrentServiceNom,
                CurrentLocation = documentInfo.CurrentLocation,

                // Service source
                SourceServiceId = transaction.SourceServiceId,

                // Récupération du nom du service source
                SourceServiceNom = await GetServiceNameAsync(transaction.SourceServiceId),

                // Service destinataire
                DestinationServiceId = transaction.DestinationServiceId,

                // Récupération du nom du service destinataire
                DestinationServiceNom = await GetServiceNameAsync(transaction.DestinationServiceId),

                // Utilisateur destinataire, s'il existe
                DestinationUserId = transaction.DestinationUserId,

                // Récupération du nom complet de l'utilisateur destinataire
                DestinationUserName = await GetUserNameAsync(transaction.DestinationUserId),
                SenderUserName = transaction.SenderUserName,
                SenderServiceName = transaction.SenderServiceName,

                // Indique si le document doit revenir au service source
                DoitRevenir = transaction.DoitRevenir,

                // Dates de la transaction
                DateEnvoi = transaction.DateEnvoi,
                DateReponse = transaction.DateReponse,

                // État actuel de la transaction
                Statut = transaction.Statut,

                // Message envoyé par le service source
                Message = transaction.Message,

                // Message de réponse du service destinataire
                MessageReponse = transaction.MessageReponse,
                ResponderUserName = transaction.ResponderUserName,
                ResponderServiceId = transaction.ResponderServiceId,
                ResponderServiceName = transaction.ResponderServiceName
            });
        }

        // Retourne la liste prête à être affichée dans l'interface
        return result;
    }

    /// <summary>
    /// Récupère le sujet du document concerné par la transaction.
    /// Le document peut être soit un courrier administratif, soit un courrier judiciaire.
    /// </summary>
    private async Task<string> GetDocumentSujetAsync(int documentId, string documentType)
    {
        // Si le document est de type administratif
        if (documentType.Equals("Administratif", StringComparison.OrdinalIgnoreCase))
        {
            // Recherche du courrier administratif par son ID
            // Si le document existe, on retourne son sujet
            // Sinon, on retourne une chaîne vide
            return (await _courrierAdministratifRepository.FindAsync(documentId))?.Sujet ?? string.Empty;
        }

        // Si le document est de type judiciaire
        if (documentType.Equals("Judiciaire", StringComparison.OrdinalIgnoreCase))
        {
            // Recherche du courrier judiciaire par son ID
            // Si le document existe, on retourne son sujet
            // Sinon, on retourne une chaîne vide
            return (await _courrierJudiciaireRepository.FindAsync(documentId))?.Sujet ?? string.Empty;
        }

        // Si le type du document n'est pas reconnu, on retourne une chaîne vide
        return string.Empty;
    }

    /// <summary>
    /// Récupère le nom d'un service à partir de son identifiant.
    /// Cette méthode permet d'afficher un nom lisible au lieu d'un simple ID.
    /// </summary>
    private async Task<string> GetServiceNameAsync(int serviceId)
    {
        // Recherche du service par son ID
        // Si le service existe, on retourne son nom
        // Sinon, on retourne une chaîne vide
        return (await _serviceRepository.FindAsync(serviceId))?.NomService ?? string.Empty;
    }

    /// <summary>
    /// Récupère le nom complet d'un utilisateur à partir de son identifiant.
    /// L'utilisateur peut être null, car une transaction peut être envoyée vers un service
    /// sans choisir un utilisateur précis.
    /// </summary>
    private async Task<string?> GetUserNameAsync(int? userId)
    {
        // Si aucun utilisateur n'est précisé, on retourne null
        if (!userId.HasValue)
        {
            return null;
        }

        // Recherche de l'utilisateur par son ID
        // Si l'utilisateur existe, on retourne son nom complet
        return (await _utilisateurRepository.FindAsync(userId.Value))?.NomComplet;
    }

    private sealed record DocumentInfo(
        string Subject,
        string? NumeroBureauOrdre,
        string? NumeroCourrier,
        string? NumeroDossierJudiciaire,
        int? CurrentServiceId,
        string CurrentServiceNom,
        string CurrentLocation)
    {
        public static DocumentInfo Empty { get; } = new(string.Empty, null, null, null, null, string.Empty, string.Empty);
    }
}
