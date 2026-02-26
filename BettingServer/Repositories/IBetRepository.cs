using BettingServer.Models;

namespace BettingServer.Repositories
{
    public interface IBetRepository
    {
        Bet Get(int id);
        IEnumerable<Bet> GetByUserId(int userId);
        IEnumerable<Bet> GetAll();
        void Add(Bet bet);
        void Delete(Bet bet);
        void Save();
    }
}