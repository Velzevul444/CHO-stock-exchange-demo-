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

        [HttpGet("user/{userId}")]
        public IActionResult GetByUser(int userId) =>
            Ok(_service.GetByUser(userId));

        [HttpPost]
        public IActionResult Create(Bet bet)
        {
            var res = _service.PlaceBet(bet);
            return res.Success ? Ok(bet) : BadRequest(res.Message);
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            _service.Delete(id);
            return Ok();
        }
    }
}