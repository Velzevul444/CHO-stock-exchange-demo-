using BettingServer.Models;
using BettingServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace BettingServer.Controllers
{
    [ApiController]
    [Route("api/messages")]
    public class AdminMessagesController : ControllerBase
    {
        private readonly AdminMessageService _service;

        public AdminMessagesController(AdminMessageService service)
        {
            _service = service;
        }

        [HttpGet]
        public IActionResult GetAll() => Ok(_service.GetAll());

        [HttpGet("user/{userId}")]
        public IActionResult GetByUser(int userId) =>
            Ok(_service.GetByUserId(userId));

        [HttpPost]
        public IActionResult Create(AdminMessage message)
        {
            _service.Add(message);
            return Ok(message);
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            _service.Delete(id);
            return Ok();
        }
    }
}