namespace BettingServer.Models
{
    public class Bet
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int EventId { get; set; }
        public int Amount { get; set; }
        public string BetType { get; set; } // 1 / X / 2
        public decimal Coefficient { get; set; }
        public DateTime CreatedAt { get; set; }

        public User User { get; set; }
        public Event Event { get; set; }
    }
}