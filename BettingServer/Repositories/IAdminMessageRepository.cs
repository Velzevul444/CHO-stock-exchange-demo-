using BettingServer.Models;

namespace BettingServer.Repositories
{
    public interface IAdminMessageRepository
    {
        IEnumerable<AdminMessage> GetAll();
        IEnumerable<AdminMessage> GetByUserId(int userId);
        AdminMessage Get(int id);
        void Add(AdminMessage message);
        void Delete(AdminMessage message);
        void Save();
    }
}