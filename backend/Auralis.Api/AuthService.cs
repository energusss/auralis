using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Auralis.Application;
using Auralis.Domain;
using Auralis.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
namespace Auralis.Api;
public record UserDto(Guid Id,string Email,string DisplayName);
public record SessionDto(string AccessToken,string RefreshToken,UserDto User);
public class AuthService(AuralisDb db,IConfiguration config) {
 public async Task<SessionDto> Issue(User user,Guid? family=null) {
 var secret=Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));db.RefreshTokens.Add(new(){UserId=user.Id,Hash=Passwords.TokenHash(secret),ExpiresAt=DateTimeOffset.UtcNow.AddDays(30),FamilyId=family??Guid.NewGuid()});await db.SaveChangesAsync();
 var key=config["JWT_KEY"]??config["Jwt:Key"]!;var token=new JwtSecurityToken("auralis","auralis-web",[new Claim(ClaimTypes.NameIdentifier,user.Id.ToString()),new Claim(ClaimTypes.Name,user.DisplayName)],expires:DateTime.UtcNow.AddMinutes(15),signingCredentials:new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),SecurityAlgorithms.HmacSha256));return new(new JwtSecurityTokenHandler().WriteToken(token),secret,new(user.Id,user.Email,user.DisplayName));
 }
 public async Task<SessionDto?> Refresh(string token) {
 var hash=Passwords.TokenHash(token);var stored=await db.RefreshTokens.SingleOrDefaultAsync(t=>t.Hash==hash);if(stored is null)return null;
 if(stored.Revoked){var family=await db.RefreshTokens.Where(t=>t.FamilyId==stored.FamilyId).ToListAsync();foreach(var t in family)t.Revoked=true;await db.SaveChangesAsync();return null;}
 if(stored.ExpiresAt<=DateTimeOffset.UtcNow)return null;
 stored.Revoked=true;var user=await db.Users.FindAsync(stored.UserId);if(user is null)return null;
 try{return await Issue(user,stored.FamilyId);}catch(DbUpdateConcurrencyException){return null;}
 }
}
