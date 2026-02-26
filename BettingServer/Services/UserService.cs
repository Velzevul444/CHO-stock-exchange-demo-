using BettingServer.Models;
using BettingServer.Repositories;

namespace BettingServer.Services
{
    public class UserService
    {
        private readonly IUserRepository _repo;

        public UserService(IUserRepository repo)
        {
            _repo = repo;
        }

        public IEnumerable<User> GetAll() => _repo.GetAll();

        public User Get(int id) => _repo.Get(id);

        public User GetByUsername(string username) => _repo.GetByUsername(username);

        public void Add(User user)
        {
            _repo.Add(user);
            _repo.Save();
        }

        public void Update(User user)
        {
            _repo.Update(user);
            _repo.Save();
        }

        public void Delete(int id)
        {
            var user = _repo.Get(id);
            if (user != null)
            {
                _repo.Delete(user);
                _repo.Save();
            }
        }
    }
}