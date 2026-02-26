namespace BettingServer.Models
{
    public class Event
    {
        public int Id { get; set; }
        public string Team1 { get; set; }
        public string Team2 { get; set; }
        public string League { get; set; }
        public decimal Coef1 { get; set; }
        public decimal CoefX { get; set; }
        public decimal Coef2 { get; set; }
        public DateTime Date { get; set; }

        public string Description { get; set; }
        public string SportType { get; set; }
        public string Image { get; set; }

        public string Result { get; set; } // 1 / X / 2

        public ICollection<Bet> Bets { get; set; }
    }
}