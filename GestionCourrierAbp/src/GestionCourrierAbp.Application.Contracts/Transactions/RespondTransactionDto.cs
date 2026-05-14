namespace GestionCourrierAbp.Transactions;

public class RespondTransactionDto
{
    public bool Accepte { get; set; }
    public string? Message { get; set; }
    public string? ResponderUserName { get; set; }
    public int? ResponderServiceId { get; set; }
    public string? ResponderServiceName { get; set; }
}
