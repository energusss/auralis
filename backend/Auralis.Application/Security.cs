using System.Security.Cryptography;
namespace Auralis.Application;
public static class Passwords {
 public static string Hash(string password) { var salt=RandomNumberGenerator.GetBytes(16); var hash=Rfc2898DeriveBytes.Pbkdf2(password,salt,210000,HashAlgorithmName.SHA512,64); return $"210000.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}"; }
 public static bool Verify(string password,string stored) { try {var p=stored.Split('.'); var hash=Rfc2898DeriveBytes.Pbkdf2(password,Convert.FromBase64String(p[1]),int.Parse(p[0]),HashAlgorithmName.SHA512,64); return CryptographicOperations.FixedTimeEquals(hash,Convert.FromBase64String(p[2]));} catch(FormatException){return false;} catch(IndexOutOfRangeException){return false;} }
 public static string TokenHash(string token)=>Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
}
public static class PlaylistOrder {
 public static bool IsValid(IReadOnlyCollection<string> existing,IReadOnlyCollection<string> proposed)=>existing.Count==proposed.Count && proposed.Distinct().Count()==proposed.Count && existing.ToHashSet().SetEquals(proposed);
}
