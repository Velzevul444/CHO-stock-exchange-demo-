using BettingServer.Models;
using BettingServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace BettingServer.Controllers
{
    [ApiController]
    [Route("api/events")]
    public class EventController : ControllerBase
    {
        private readonly EventService _service;

        public EventController(EventService service)
        {
            _service = service;
        }

        [HttpGet]
        public IActionResult GetAll() => Ok(_service.GetAll());

        [HttpGet("{id}")]
        public IActionResult Get(int id)
        {
            var ev = _service.Get(id);
            return ev == null ? NotFound() : Ok(ev);
        }

        [HttpPost]
        public IActionResult Create(Event ev)
        {
            _service.Add(ev);
            return Ok(ev);
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, Event ev)
        {
            ev.Id = id;
            _service.Update(ev);
            return Ok(ev);
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            _service.Delete(id);
            return Ok();
        }
    }
}