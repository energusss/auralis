using Auralis.Domain;
using Microsoft.EntityFrameworkCore;
namespace Auralis.Infrastructure;
public class AuralisDb(DbContextOptions<AuralisDb> options):DbContext(options) {
 public DbSet<User> Users=>Set<User>(); public DbSet<RefreshToken> RefreshTokens=>Set<RefreshToken>(); public DbSet<Playlist> Playlists=>Set<Playlist>(); public DbSet<PlaylistTrack> PlaylistTracks=>Set<PlaylistTrack>(); public DbSet<LibraryItem> LibraryItems=>Set<LibraryItem>(); public DbSet<PlaybackHistory> History=>Set<PlaybackHistory>(); public DbSet<SearchHistory> Searches=>Set<SearchHistory>();
 protected override void OnModelCreating(ModelBuilder b) {
 b.Entity<User>().HasIndex(x=>x.Email).IsUnique(); b.Entity<User>().HasIndex(x=>x.GoogleSubject).IsUnique(); b.Entity<User>().Property(x=>x.Email).HasMaxLength(254); b.Entity<User>().Property(x=>x.DisplayName).HasMaxLength(80); b.Entity<User>().Property(x=>x.GoogleSubject).HasMaxLength(255);
 b.Entity<RefreshToken>().HasIndex(x=>x.Hash).IsUnique(); b.Entity<RefreshToken>().Property(x=>x.Revoked).IsConcurrencyToken(); b.Entity<RefreshToken>().HasIndex(x=>x.UserId); b.Entity<RefreshToken>().HasOne<User>().WithMany().HasForeignKey(x=>x.UserId).OnDelete(DeleteBehavior.Cascade);
 b.Entity<Playlist>().HasIndex(x=>x.UserId); b.Entity<Playlist>().Property(x=>x.Name).HasMaxLength(100); b.Entity<Playlist>().HasOne<User>().WithMany().HasForeignKey(x=>x.UserId).OnDelete(DeleteBehavior.Cascade);
 b.Entity<PlaylistTrack>().HasKey(x=>new{x.PlaylistId,x.TrackId}); b.Entity<PlaylistTrack>().HasIndex(x=>new{x.PlaylistId,x.Position}); b.Entity<Playlist>().HasMany(x=>x.Tracks).WithOne().HasForeignKey(x=>x.PlaylistId).OnDelete(DeleteBehavior.Cascade);
 b.Entity<LibraryItem>().HasKey(x=>new{x.UserId,x.Kind,x.ItemId}); b.Entity<LibraryItem>().HasOne<User>().WithMany().HasForeignKey(x=>x.UserId).OnDelete(DeleteBehavior.Cascade);
 b.Entity<PlaybackHistory>().HasIndex(x=>new{x.UserId,x.EventId}).IsUnique(); b.Entity<PlaybackHistory>().HasIndex(x=>new{x.UserId,x.PlayedAt}); b.Entity<PlaybackHistory>().HasOne<User>().WithMany().HasForeignKey(x=>x.UserId).OnDelete(DeleteBehavior.Cascade);
 b.Entity<SearchHistory>().HasIndex(x=>new{x.UserId,x.Query}).IsUnique(); b.Entity<SearchHistory>().HasOne<User>().WithMany().HasForeignKey(x=>x.UserId).OnDelete(DeleteBehavior.Cascade);
 }
}
