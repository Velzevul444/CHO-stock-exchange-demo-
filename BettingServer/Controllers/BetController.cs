using BettingServer.Models;
using BettingServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace BettingServer.Controllers
{
    [ApiController]
    [Route("api/bets")]
    public class BetController : ControllerBase
    {
        private readonly BetService _service;

        public BetController(BetService service)
        {
            _service = service;
        }

        // Получить все ставки пользователя
        [HttpGet("user/{userId}")]
        public IActionResult GetByUser(int userId)
        {
            var bets = _service.GetByUser(userId);
            return Ok(bets);
        }

        // Поставить ставку
        [HttpPost]
        public IActionResult PlaceBet([FromBody] Bet bet)
        {
            if (bet == null)
                return BadRequest("Invalid bet");

            var result = _service.PlaceBet(bet);

            if (!result.Success)
                return BadRequest(result.Message);

            return Ok(result.Message);
        }

        // Удалить ставку
        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            _service.Delete(id);
            return Ok();
        }
    }
}