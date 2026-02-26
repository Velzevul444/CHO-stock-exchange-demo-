using BettingServer.Data;
using BettingServer.Models;

namespace BettingServer.Repositories
{
    public class EventRepository : IEventRepository
    {
        private readonly ApplicationDbContext _db;

        public EventRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public Event Get(int id) => _db.Events.Find(id);

        public IEnumerable<Event> GetAll() => _db.Events.ToList();

        public void Add(Event ev) => _db.Events.Add(ev);

        public void Update(Event ev) => _db.Events.Update(ev);

        public void Delete(Event ev) => _db.Events.Remove(ev);

        public void Save() => _db.SaveChanges();
    }
}