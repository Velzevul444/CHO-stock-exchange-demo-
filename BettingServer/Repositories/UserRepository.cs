using BettingServer.Data;
using BettingServer.Models;

namespace BettingServer.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _db;

        public UserRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public User Get(int id) => _db.Users.Find(id);

        public User GetByUsername(string username) =>
            _db.Users.FirstOrDefault(x => x.Username == username);

        public IEnumerable<User> GetAll() => _db.Users.ToList();

        public void Add(User user) => _db.Users.Add(user);

        public void Update(User user) => _db.Users.Update(user);

        public void Delete(User user) => _db.Users.Remove(user);

        public void Save() => _db.SaveChanges();
    }
}