using BettingServer.Models;
using Microsoft.EntityFrameworkCore;

namespace BettingServer.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<AdminMessage> AdminMessages { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<Bet> Bets { get; set; }
    }
}