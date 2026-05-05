namespace GestionCourrierAbp.Workflows;

public enum WorkflowStatus
{
    Nouveau,
    EnCours,
    EnAttente,
    Accepte,
    Refuse,
    Annule,
    EnAttenteRetour,
    Retourne,
    Traite,
    Archive,
    Retire,
    RetourArchive
}

public static class WorkflowStatusExtensions
{
    public static string ToStorageValue(this WorkflowStatus status)
    {
        return status switch
        {
            WorkflowStatus.Nouveau => "Nouveau",
            WorkflowStatus.EnCours => "En cours",
            WorkflowStatus.EnAttente => "En attente",
            WorkflowStatus.Accepte => "Accepté",
            WorkflowStatus.Refuse => "Refusé",
            WorkflowStatus.Annule => "Annulé",
            WorkflowStatus.EnAttenteRetour => "En attente de retour",
            WorkflowStatus.Retourne => "Retourné",
            WorkflowStatus.Traite => "Traite",
            WorkflowStatus.Archive => "Archive",
            WorkflowStatus.Retire => "Retiré",
            WorkflowStatus.RetourArchive => "Retour archive",
            _ => status.ToString()
        };
    }

    public static bool IsSameAs(this string? value, WorkflowStatus status)
    {
        return value == status.ToStorageValue();
    }

    public static bool IsActiveTransactionStatus(this string? value)
    {
        return value.IsSameAs(WorkflowStatus.EnAttente) ||
               value.IsSameAs(WorkflowStatus.Accepte);
    }
}
