using System;
using System.ComponentModel.DataAnnotations;

namespace BettingServer.Models
{
    public class AdminMessage
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public string MessageText { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}