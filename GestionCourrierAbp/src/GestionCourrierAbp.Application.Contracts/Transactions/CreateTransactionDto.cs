using System.ComponentModel.DataAnnotations;

namespace GestionCourrierAbp.Transactions;

public class CreateTransactionDto
{
    [Range(1, int.MaxValue)]
    public int DocumentId { get; set; }

    [Required]
    public string DocumentType { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int SourceServiceId { get; set; }

    [Range(1, int.MaxValue)]
    public int DestinationServiceId { get; set; }

    public int? DestinationUserId { get; set; }

    public bool DoitRevenir { get; set; }

    public string Message { get; set; } = string.Empty;
}
