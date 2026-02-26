using BettingServer.Data;
using BettingServer.Models;

namespace BettingServer.Repositories
{
    public class AdminMessageRepository : IAdminMessageRepository
    {
        private readonly ApplicationDbContext _db;

        public AdminMessageRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public IEnumerable<AdminMessage> GetAll() =>
            _db.AdminMessages.ToList();

        public IEnumerable<AdminMessage> GetByUserId(int userId) =>
            _db.AdminMessages.Where(x => x.UserId == userId).ToList();

        public AdminMessage Get(int id) => _db.AdminMessages.Find(id);

        public void Add(AdminMessage message) => _db.AdminMessages.Add(message);

        public void Delete(AdminMessage msg) => _db.AdminMessages.Remove(msg);

        public void Save() => _db.SaveChanges();
    }
}