using Microsoft.EntityFrameworkCore;
using GestionCourrierAbp.Courriers;
using GestionCourrierAbp.Equipements;
using GestionCourrierAbp.Services;
using GestionCourrierAbp.Transactions;
using GestionCourrierAbp.Utilisateurs;
using Volo.Abp.AuditLogging.EntityFrameworkCore;
using Volo.Abp.BackgroundJobs.EntityFrameworkCore;
using Volo.Abp.BlobStoring.Database.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore.Modeling;
using Volo.Abp.FeatureManagement.EntityFrameworkCore;
using Volo.Abp.Identity;
using Volo.Abp.Identity.EntityFrameworkCore;
using Volo.Abp.PermissionManagement.EntityFrameworkCore;
using Volo.Abp.SettingManagement.EntityFrameworkCore;
using Volo.Abp.OpenIddict.EntityFrameworkCore;

namespace GestionCourrierAbp.EntityFrameworkCore;

[ReplaceDbContext(typeof(IIdentityDbContext))]
[ConnectionStringName("Default")]
public class GestionCourrierAbpDbContext :
    AbpDbContext<GestionCourrierAbpDbContext>,
    IIdentityDbContext
{
    /* Add DbSet properties for your Aggregate Roots / Entities here. */

    public DbSet<Service> Services { get; set; }
    public DbSet<Equipement> Equipements { get; set; }
    public DbSet<Utilisateur> Utilisateurs { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<CourrierAdministratif> CourriersAdministratifs { get; set; }
    public DbSet<CourrierJudiciaire> CourriersJudiciaires { get; set; }
    public DbSet<RetraitJudiciaire> RetraitsJudiciaires { get; set; }

    #region Entities from the modules

    /* Notice: We only implemented IIdentityProDbContext 
     * and replaced them for this DbContext. This allows you to perform JOIN
     * queries for the entities of these modules over the repositories easily. You
     * typically don't need that for other modules. But, if you need, you can
     * implement the DbContext interface of the needed module and use ReplaceDbContext
     * attribute just like IIdentityProDbContext .
     *
     * More info: Replacing a DbContext of a module ensures that the related module
     * uses this DbContext on runtime. Otherwise, it will use its own DbContext class.
     */

    // Identity
    public DbSet<IdentityUser> Users { get; set; }
    public DbSet<IdentityRole> Roles { get; set; }
    public DbSet<IdentityClaimType> ClaimTypes { get; set; }
    public DbSet<OrganizationUnit> OrganizationUnits { get; set; }
    public DbSet<IdentitySecurityLog> SecurityLogs { get; set; }
    public DbSet<IdentityLinkUser> LinkUsers { get; set; }
    public DbSet<IdentityUserDelegation> UserDelegations { get; set; }
    public DbSet<IdentitySession> Sessions { get; set; }

    #endregion

    public GestionCourrierAbpDbContext(DbContextOptions<GestionCourrierAbpDbContext> options)
        : base(options)
    {

    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        /* Include modules to your migration db context */

        builder.ConfigurePermissionManagement();
        builder.ConfigureSettingManagement();
        builder.ConfigureBackgroundJobs();
        builder.ConfigureAuditLogging();
        builder.ConfigureFeatureManagement();
        builder.ConfigureIdentity();
        builder.ConfigureOpenIddict();
        builder.ConfigureBlobStoring();
        
        /* Configure your own tables/entities inside here */

        builder.Entity<Service>(b =>
        {
            b.ToTable(GestionCourrierAbpConsts.DbTablePrefix + "Services", GestionCourrierAbpConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.NomService).IsRequired().HasMaxLength(256);
            b.Property(x => x.Description).HasMaxLength(1024);
            b.Property(x => x.Etage).HasMaxLength(64);
        });

        builder.Entity<Equipement>(b =>
        {
            b.ToTable(GestionCourrierAbpConsts.DbTablePrefix + "Equipements", GestionCourrierAbpConsts.DbSchema);
            b.ConfigureByConvention();
            b.HasOne(x => x.Service)
                .WithMany(x => x.Equipements)
                .HasForeignKey(x => x.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Utilisateur>(b =>
        {
            b.ToTable(GestionCourrierAbpConsts.DbTablePrefix + "Utilisateurs", GestionCourrierAbpConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.NomComplet).IsRequired().HasMaxLength(256);
            b.Property(x => x.Login).IsRequired().HasMaxLength(128);
            b.Property(x => x.PasswordHash).IsRequired().HasMaxLength(256);
            b.HasIndex(x => x.Login).IsUnique();
            b.HasOne(x => x.Service)
                .WithMany(x => x.Utilisateurs)
                .HasForeignKey(x => x.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Transaction>(b =>
        {
            b.ToTable(GestionCourrierAbpConsts.DbTablePrefix + "Transactions", GestionCourrierAbpConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.DocumentType).IsRequired().HasMaxLength(64);
            b.Property(x => x.Message).HasMaxLength(2048);
            b.Property(x => x.Statut).IsRequired().HasMaxLength(64);
            b.Property(x => x.MessageReponse).HasMaxLength(2048);

            b.HasOne(x => x.SourceService)
                .WithMany()
                .HasForeignKey(x => x.SourceServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.DestinationService)
                .WithMany()
                .HasForeignKey(x => x.DestinationServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.DestinationUser)
                .WithMany()
                .HasForeignKey(x => x.DestinationUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<CourrierAdministratif>(b =>
        {
            b.ToTable(GestionCourrierAbpConsts.DbTablePrefix + "CourriersAdministratifs", GestionCourrierAbpConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Sujet).IsRequired().HasMaxLength(512);
            b.Property(x => x.Source).HasMaxLength(512);
            b.Property(x => x.Destinataire).HasMaxLength(512);
            b.Property(x => x.Direction).HasMaxLength(64);
            b.Property(x => x.Etat).HasMaxLength(64);
            b.Property(x => x.TypeRegistre).HasMaxLength(64);
            b.Property(x => x.TypeCorrespondance).HasMaxLength(64);
            b.Property(x => x.NumeroDeCourrier).HasMaxLength(128);
            b.Property(x => x.LienPdf).HasMaxLength(1024);
            b.HasOne(x => x.Service)
                .WithMany()
                .HasForeignKey(x => x.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<CourrierJudiciaire>(b =>
        {
            b.ToTable(GestionCourrierAbpConsts.DbTablePrefix + "CourriersJudiciaires", GestionCourrierAbpConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.TribunalSource).IsRequired().HasMaxLength(512);
            b.Property(x => x.Sujet).IsRequired().HasMaxLength(512);
            b.Property(x => x.Direction).HasMaxLength(64);
            b.Property(x => x.Destinataire).HasMaxLength(512);
            b.Property(x => x.EtatArchive).HasMaxLength(64);
            b.Property(x => x.Emplacement).HasMaxLength(512);
            b.Property(x => x.LienPdf).HasMaxLength(1024);
            b.HasOne(x => x.Service)
                .WithMany()
                .HasForeignKey(x => x.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RetraitJudiciaire>(b =>
        {
            b.ToTable(GestionCourrierAbpConsts.DbTablePrefix + "RetraitsJudiciaires", GestionCourrierAbpConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.MotifDeRetrait).IsRequired().HasMaxLength(1024);
            b.Property(x => x.EffectuePar).HasMaxLength(256);
            b.Property(x => x.Notes).HasMaxLength(2048);
            b.HasOne(x => x.CourrierJudiciaire)
                .WithMany(x => x.Retraits)
                .HasForeignKey(x => x.CourrierJudiciaireId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
