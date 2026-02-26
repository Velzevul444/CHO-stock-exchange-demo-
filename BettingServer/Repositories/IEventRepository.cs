using BettingServer.Models;

namespace BettingServer.Repositories
{
    public interface IEventRepository
    {
        Event Get(int id);
        IEnumerable<Event> GetAll();
        void Add(Event ev);
        void Update(Event ev);
        void Delete(Event ev);
        void Save();
    }
}