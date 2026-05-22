using System.Threading.Tasks;
using GestionCourrierAbp.Lookups;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Controllers;

[ApiController]
public class LookupItemsController : ControllerBase
{
    private readonly ILookupItemAppService _lookupItemAppService;

    public LookupItemsController(ILookupItemAppService lookupItemAppService)
    {
        _lookupItemAppService = lookupItemAppService;
    }

    [HttpGet("api/lookups")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _lookupItemAppService.GetListAsync(new PagedAndSortedResultRequestDto
        {
            SkipCount = 0,
            MaxResultCount = 1000
        });

        return Ok(result.Items);
    }

    [HttpGet("api/lookups/{listName}")]
    public async Task<IActionResult> GetByListName(string listName)
    {
        return Ok(await _lookupItemAppService.GetByListNameAsync(listName));
    }

    [HttpPost("api/lookups")]
    public async Task<IActionResult> Create([FromBody] CreateUpdateLookupItemDto input)
    {
        return Ok(await _lookupItemAppService.CreateAsync(input));
    }

    [HttpPut("api/lookups/{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateUpdateLookupItemDto input)
    {
        return Ok(await _lookupItemAppService.UpdateAsync(id, input));
    }

    [HttpDelete("api/lookups/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _lookupItemAppService.DeleteAsync(id);
        return NoContent();
    }
}
