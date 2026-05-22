using System;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Lookups;

public class LookupItemDto : EntityDto<int>
{
    public string ListName { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreationTime { get; set; }
}
