namespace BettingServer.Models
{
    public class AdminMessage
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string MessageText { get; set; }
        public DateTime CreatedAt { get; set; }

        public User User { get; set; }
    }
}