using Volo.Abp.Domain.Entities.Auditing;

namespace GestionCourrierAbp.Lookups;

public class LookupItem : AuditedAggregateRoot<int>
{
    public string ListName { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
