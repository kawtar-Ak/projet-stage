using Microsoft.EntityFrameworkCore;

namespace GestionCourrier.Models
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Service> Services { get; set; }
        public DbSet<EntiteDJ> EntitesDJs { get; set; }
        public DbSet<Entite> Entites { get; set; }
        public DbSet<NumeroDossierJuridique> NumerosDossierJuridique { get; set; }
        public DbSet<Retrait> Retraits { get; set; }
        
        public DbSet<Circulation> Circulations { get; set; }
        public DbSet<Registre> Registres { get; set; }
        public DbSet<Reponse> Reponses { get; set; }
        public DbSet<Equipment> Equipements { get; set; }
        public DbSet<Utilisateur> Utilisateurs { get; set; }
        public DbSet<Id> Ids { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<EntiteDJ>()
                .HasOne(e => e.Service)
                .WithMany(s => s.EntitesDJ)
                .HasForeignKey(e => e.IdService)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Entite>()
                .HasOne(e => e.Service)
                .WithMany(s => s.Entites)
                .HasForeignKey(e => e.IdService)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Registre>()
                .HasOne(r => r.Service)
                .WithMany(s => s.Registres)
                .HasForeignKey(r => r.IdService)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Equipment>()
                .HasOne(eq => eq.Service)
                .WithMany(s => s.Equipements)
                .HasForeignKey(eq => eq.IdService)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Utilisateur>()
                .HasOne(u => u.Service)
                .WithMany(s => s.Utilisateurs)
                .HasForeignKey(u => u.IdService)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<NumeroDossierJuridique>()
                .HasOne(n => n.EntiteDJ)
                .WithOne(e => e.NumeroDossier)
                .HasForeignKey<NumeroDossierJuridique>(n => n.EntiteDJId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Retrait>()
                .HasOne(r => r.EntiteDJ)
                .WithMany(e => e.Retraits)
                .HasForeignKey(r => r.EntiteDJId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Circulation>()
                .HasOne(c => c.Entite)
                .WithMany(e => e.Circulations)
                .HasForeignKey(c => c.EntiteId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Reponse>()
                .HasOne(r => r.Registre)
                .WithMany(reg => reg.Reponses)
                .HasForeignKey(r => r.RegistreId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Entite>()
                .Property(e => e.TypeGenerale)
                .HasConversion<int>();
        }
    }
}