using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AssetFlow.Auth.Data;
using AssetFlow.Auth.Models;

[ApiController]
[Route("api/assets")]
public class AssetsController : ControllerBase
{
    private readonly UserDbContext _context;

    public class CreateMovementRequest
    {
        public string MovementType { get; set; }
        public string? FromLocation { get; set; }
        public string? ToLocation { get; set; }
        public string MovedBy { get; set; }
        public DateTime MovementDate { get; set; }
    }

    public class UpdateAssetStatusLocationRequest
    {
        public string? AssetsStatus { get; set; }
        public string? AssetsLocation { get; set; }
    }

    public class CreateAssetRequest
    {
        public string? DasId { get; set; }
        public string? UserName { get; set; }
        public string? AssetsLocation { get; set; }
        public string? Make { get; set; }
        public string? Model { get; set; }
        public string? LaptopCategory { get; set; }
        public string? LaptopAssetsTag { get; set; }
        public string? PowerAdapterDetails { get; set; }
        public DateTime? AssignmentDate { get; set; }
        public string? InstallStatus { get; set; }
        public string? AssetsStatus { get; set; }
        public string? Additional16GbRamStatus { get; set; }
        public string? AssetsProcureStatus { get; set; }
        public DateTime? WarrantyStartDate { get; set; }
        public DateTime? WarrantyExpiredDate { get; set; }
        public int? AgeingOfAssets { get; set; }

        public string? Processor { get; set; }
        public string? Ram { get; set; }
        public string? Storage { get; set; }
        public string? Display { get; set; }
        public string? Gpu { get; set; }

        public string? Department { get; set; }
        public string? Owner { get; set; }
    }

    public AssetsController(UserDbContext context)
    {
        _context = context;
    }

    // GET: api/assets
    [HttpGet]
   // remove if you want public
    public async Task<IActionResult> GetAssets()
    {
        var assets = await _context.Assets
            .Include(a => a.TechnicalSpecification)
            .Include(a => a.Assignment)
            .Include(a => a.Movements)
            .Include(a => a.MaintenanceHistory)
            .ToListAsync();
        return Ok(assets);
    }
    [HttpGet("{id}")]
    public async Task<IActionResult> GetAssetDetails(int id)
    {
        var asset = await _context.Assets
            .Include(a => a.TechnicalSpecification)
            .Include(a => a.Assignment)
            .Include(a => a.Movements)
            .Include(a => a.MaintenanceHistory)
            .FirstOrDefaultAsync(a => a.AssetId == id);

        if (asset == null)
            return NotFound();

        return Ok(asset);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsset([FromBody] CreateAssetRequest request)
    {
        if (request == null)
            return BadRequest();

        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        if (string.IsNullOrWhiteSpace(request.LaptopAssetsTag) ||
            string.IsNullOrWhiteSpace(request.DasId) ||
            string.IsNullOrWhiteSpace(request.AssetsLocation) ||
            string.IsNullOrWhiteSpace(request.Make) ||
            string.IsNullOrWhiteSpace(request.Model) ||
            string.IsNullOrWhiteSpace(request.LaptopCategory) ||
            string.IsNullOrWhiteSpace(request.AssetsStatus))
        {
            return BadRequest("Missing required fields");
        }

        var asset = new Asset
        {
            DasId = request.DasId,
            UserName = request.UserName ?? "",
            AssetsLocation = request.AssetsLocation,
            Make = request.Make,
            Model = request.Model,
            LaptopCategory = request.LaptopCategory,
            LaptopAssetsTag = request.LaptopAssetsTag,
            PowerAdapterDetails = request.PowerAdapterDetails ?? "",
            AssignmentDate = request.AssignmentDate,
            InstallStatus = request.InstallStatus ?? "",
            AssetsStatus = request.AssetsStatus,
            Additional16GbRamStatus = request.Additional16GbRamStatus ?? "",
            AssetsProcureStatus = request.AssetsProcureStatus ?? "",
            WarrantyStartDate = request.WarrantyStartDate,
            WarrantyExpiredDate = request.WarrantyExpiredDate,
            AgeingOfAssets = request.AgeingOfAssets,
        };

        try
        {
            _context.Assets.Add(asset);
            await _context.SaveChangesAsync();

            var assignment = new AssetAssignment
            {
                AssetId = asset.AssetId,
                CurrentLocation = request.AssetsLocation,
                Department = string.IsNullOrWhiteSpace(request.Department) ? "" : request.Department,
                Owner = string.IsNullOrWhiteSpace(request.Owner) ? "" : request.Owner,
                Custodian = string.IsNullOrWhiteSpace(request.UserName) ? "" : request.UserName,
            };

            _context.AssetAssignments.Add(assignment);
            await _context.SaveChangesAsync();

            asset.Assignment = assignment;

            if (!string.IsNullOrWhiteSpace(request.Processor) ||
                !string.IsNullOrWhiteSpace(request.Ram) ||
                !string.IsNullOrWhiteSpace(request.Storage) ||
                !string.IsNullOrWhiteSpace(request.Display) ||
                !string.IsNullOrWhiteSpace(request.Gpu))
            {
                var spec = new AssetTechnicalSpecification
                {
                    AssetId = asset.AssetId,
                    Processor = request.Processor ?? "",
                    Ram = request.Ram ?? "",
                    Storage = request.Storage ?? "",
                    Display = request.Display ?? "",
                    Gpu = request.Gpu ?? "",
                };

                _context.AssetTechnicalSpecifications.Add(spec);
                await _context.SaveChangesAsync();

                asset.TechnicalSpecification = spec;
            }

            return CreatedAtAction(nameof(GetAssetDetails), new { id = asset.AssetId }, asset);
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                title: "Failed to create asset",
                statusCode: StatusCodes.Status500InternalServerError
            );
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAsset(int id, [FromBody] UpdateAssetStatusLocationRequest request)
    {
        if (request == null)
            return BadRequest();

        if (string.IsNullOrWhiteSpace(request.AssetsStatus) || string.IsNullOrWhiteSpace(request.AssetsLocation))
            return BadRequest("Missing required fields");

        try
        {
            var asset = await _context.Assets
                .Include(a => a.Assignment)
                .FirstOrDefaultAsync(a => a.AssetId == id);

            if (asset == null)
                return NotFound();

            var statusChanged = asset.AssetsStatus != request.AssetsStatus;
            var locationChanged = asset.AssetsLocation != request.AssetsLocation;

            asset.AssetsStatus = request.AssetsStatus;
            asset.AssetsLocation = request.AssetsLocation;

            if (asset.Assignment != null)
                asset.Assignment.CurrentLocation = request.AssetsLocation;

            if (statusChanged || locationChanged)
            {
                var movement = new AssetMovementHistory
                {
                    AssetId = asset.AssetId,
                    MovementType = statusChanged ? "Status Change" : "Location Change",
                    FromLocation = locationChanged ? asset.AssetsLocation : null,
                    ToLocation = locationChanged ? request.AssetsLocation : null,
                    MovedBy = "System",
                    MovementDate = DateTime.UtcNow.Date,
                };

                _context.AssetMovementHistories.Add(movement);
            }

            await _context.SaveChangesAsync();
            return Ok(asset);
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                title: "Failed to update asset",
                statusCode: StatusCodes.Status500InternalServerError
            );
        }
    }

    [HttpPost("{id}/movements")]
    public async Task<IActionResult> CreateMovement(int id, [FromBody] CreateMovementRequest request)
    {
        if (request == null)
            return BadRequest();

        if (string.IsNullOrWhiteSpace(request.MovementType) || string.IsNullOrWhiteSpace(request.MovedBy))
            return BadRequest("Missing required fields");

        try
        {
            var asset = await _context.Assets.FindAsync(id);
            if (asset == null)
                return NotFound();

            var movement = new AssetMovementHistory
            {
                AssetId = id,
                MovementType = request.MovementType,
                FromLocation = request.FromLocation,
                ToLocation = request.ToLocation,
                MovedBy = request.MovedBy,
                MovementDate = request.MovementDate,
            };

            _context.AssetMovementHistories.Add(movement);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAssetDetails), new { id }, movement);
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                title: "Failed to create movement",
                statusCode: StatusCodes.Status500InternalServerError
            );
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsset(int id)
    {
        try
        {
            await using var tx = await _context.Database.BeginTransactionAsync();

            var asset = await _context.Assets
                .FirstOrDefaultAsync(a => a.AssetId == id);

            if (asset == null)
                return NotFound();

            // Delete dependents explicitly (avoids relying on navigation loading)
            var assignments = await _context.AssetAssignments
                .Where(x => x.AssetId == id)
                .ToListAsync();
            if (assignments.Count > 0)
                _context.AssetAssignments.RemoveRange(assignments);

            var specs = await _context.AssetTechnicalSpecifications
                .Where(x => x.AssetId == id)
                .ToListAsync();
            if (specs.Count > 0)
                _context.AssetTechnicalSpecifications.RemoveRange(specs);

            var movements = await _context.AssetMovementHistories
                .Where(x => x.AssetId == id)
                .ToListAsync();
            if (movements.Count > 0)
                _context.AssetMovementHistories.RemoveRange(movements);

            var maintenance = await _context.AssetMaintenanceHistories
                .Where(x => x.AssetId == id)
                .ToListAsync();
            if (maintenance.Count > 0)
                _context.AssetMaintenanceHistories.RemoveRange(maintenance);

            _context.Assets.Remove(asset);
            await _context.SaveChangesAsync();

            await tx.CommitAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            var baseMessage = ex.GetBaseException().Message;
            var detail = $"{ex.Message} | Base: {baseMessage}";
            return Problem(
                detail: detail,
                title: "Failed to delete asset",
                statusCode: StatusCodes.Status500InternalServerError
            );
        }
    }

}
