using BettingServer.Models;
using BettingServer.Repositories;

namespace BettingServer.Services
{
    public class EventService
    {
        private readonly IEventRepository _repo;

        public EventService(IEventRepository repo)
        {
            _repo = repo;
        }

        public IEnumerable<Event> GetAll() => _repo.GetAll();

        public Event Get(int id) => _repo.Get(id);

        public void Add(Event ev)
        {
            _repo.Add(ev);
            _repo.Save();
        }

        public void Update(Event ev)
        {
            _repo.Update(ev);
            _repo.Save();
        }

        public void Delete(int id)
        {
            var ev = _repo.Get(id);
            if (ev != null)
            {
                _repo.Delete(ev);
                _repo.Save();
            }
        }
    }
}