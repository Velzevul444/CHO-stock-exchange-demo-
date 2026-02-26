namespace BettingServer.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string PasswordHash { get; set; }
        public int Coins { get; set; }
        public bool IsAdmin { get; set; }

        public ICollection<Bet> Bets { get; set; } = new List<Bet>();
        public ICollection<AdminMessage> AdminMessages { get; set; } = new List<AdminMessage>();
    }
}