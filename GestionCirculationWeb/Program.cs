using GestionCourrier.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BCrypt.Net;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ========== CONFIGURATION DES SERVICES (avant Build) ==========
builder.Services.AddControllersWithViews();

// DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];
if (string.IsNullOrEmpty(jwtKey) || string.IsNullOrEmpty(jwtIssuer) || string.IsNullOrEmpty(jwtAudience))
    throw new InvalidOperationException("JWT settings are missing in appsettings.json");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization();

// CORS (autorise React)
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Pour la gestion des encodages (utile pour les imports Excel)
System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// ========== CONSTRUCTION DE L'APPLICATION ==========
var app = builder.Build();

// ========== SEED : création automatique de l'admin ==========
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();
    dbContext.Database.ExecuteSqlRaw(@"
IF COL_LENGTH('Entites', 'EstTransmissible') IS NULL
BEGIN
    ALTER TABLE Entites ADD EstTransmissible bit NOT NULL CONSTRAINT DF_Entites_EstTransmissible DEFAULT CAST(0 AS bit);
END
");
    dbContext.Database.ExecuteSqlRaw(@"
IF COL_LENGTH('EntitesDJs', 'EstTransmissible') IS NULL
BEGIN
    ALTER TABLE EntitesDJs ADD EstTransmissible bit NOT NULL CONSTRAINT DF_EntitesDJs_EstTransmissible DEFAULT CAST(0 AS bit);
END
UPDATE EntitesDJs SET EstTransmissible = CAST(1 AS bit);
");
    dbContext.Database.ExecuteSqlRaw(@"
IF COL_LENGTH('EntitesDJs', 'IdBureauOrdre') IS NOT NULL
AND EXISTS (
    SELECT 1
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID('EntitesDJs')
      AND c.name = 'IdBureauOrdre'
      AND t.name <> 'nvarchar'
)
BEGIN
    ALTER TABLE EntitesDJs ALTER COLUMN IdBureauOrdre nvarchar(100) NULL;
END
");
    if (!dbContext.Utilisateurs.Any())
    {
        var adminService = dbContext.Services.FirstOrDefault(s => s.NomService == "Administrateur");
        if (adminService == null)
        {
            adminService = new Service
            {
                NomService = "Administrateur",
                Description = "Service administrateur par défaut",
                IdService = 1   // ID explicite (car l'auto-incrémentation est désactivée)
            };
            dbContext.Services.Add(adminService);
            dbContext.SaveChanges();
        }
        var adminUser = new Utilisateur
        {
            NomComplet = "Administrateur principal",
            Login = "admin",
            Password = BCrypt.Net.BCrypt.HashPassword("admin123"),
            IdService = adminService.IdService
        };
        dbContext.Utilisateurs.Add(adminUser);
        dbContext.SaveChanges();
        Console.WriteLine("✅ Administrateur par défaut créé : login = admin, mot de passe = admin123");
    }
}

// ========== PIPELINE HTTP (middlewares) ==========
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
else
{
    app.UseDeveloperExceptionPage();   // Pour voir les erreurs détaillées en dev
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

// CORS doit être placé après UseRouting et avant UseAuthentication
app.UseCors("ReactPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");
    
    if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ========== DÉMARRAGE ==========
app.Run();
