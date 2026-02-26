using BettingServer.Models;

namespace BettingServer.Repositories
{
    public interface IUserRepository
    {
        User Get(int id);
        User GetByUsername(string username);
        IEnumerable<User> GetAll();
        void Add(User user);
        void Update(User user);
        void Delete(User user);
        void Save();
    }
}