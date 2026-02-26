using BettingServer.Models;
using BettingServer.Repositories;

namespace BettingServer.Services
{
    public class AdminMessageService
    {
        private readonly IAdminMessageRepository _repo;

        public AdminMessageService(IAdminMessageRepository repo)
        {
            _repo = repo;
        }

        public IEnumerable<AdminMessage> GetAll() => _repo.GetAll();

        public IEnumerable<AdminMessage> GetByUserId(int userId) =>
            _repo.GetByUserId(userId);

        public void Add(AdminMessage message)
        {
            _repo.Add(message);
            _repo.Save();
        }

        public void Delete(int id)
        {
            var msg = _repo.Get(id);
            if (msg != null)
            {
                _repo.Delete(msg);
                _repo.Save();
            }
        }
    }
}