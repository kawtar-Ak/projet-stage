using System.ComponentModel.DataAnnotations;

namespace GestionCourrierAbp.Lookups;

public class CreateUpdateLookupItemDto
{
    [Required]
    [MaxLength(128)]
    public string ListName { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Value { get; set; } = string.Empty;

    [MaxLength(256)]
    public string? Label { get; set; }

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;
}
