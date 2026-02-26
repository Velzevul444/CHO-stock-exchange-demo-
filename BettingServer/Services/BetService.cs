using BettingServer.Models;
using BettingServer.Repositories;

namespace BettingServer.Services
{
    public class BetService
    {
        private readonly IBetRepository _bets;
        private readonly IUserRepository _users;
        private readonly IEventRepository _events;

        public BetService(IBetRepository bets, IUserRepository users, IEventRepository events)
        {
            _bets = bets;
            _users = users;
            _events = events;
        }

        public IEnumerable<Bet> GetByUser(int userId) =>
            _bets.GetByUserId(userId);

        public (bool Success, string Message) PlaceBet(Bet bet)
        {
            var user = _users.Get(bet.UserId);
            if (user == null) return (false, "User not found");

            var ev = _events.Get(bet.EventId);
            if (ev == null) return (false, "Event not found");

            if (user.Coins < bet.Amount)
                return (false, "Not enough coins");

            user.Coins -= bet.Amount;
            _users.Update(user);

            _bets.Add(bet);
            _bets.Save();
            _users.Save();

            return (true, "Bet placed");
        }

        public void Delete(int id)
        {
            var bet = _bets.Get(id);
            if (bet != null)
            {
                _bets.Delete(bet);
                _bets.Save();
            }
        }
    }
}