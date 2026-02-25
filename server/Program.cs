using System.Data;
using System.Data.SqlClient;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtSecret = jwtSection.GetValue<string>("Secret") ?? throw new InvalidOperationException("Jwt:Secret missing");
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = signingKey,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

string connStr = app.Configuration.GetConnectionString("Default")!;

string GenerateJwtToken(string email)
{
    var claims = new[]
    {
        new Claim(JwtRegisteredClaimNames.Sub, email),
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
    };

    var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
    var token = new JwtSecurityToken(
        issuer: jwtSection["Issuer"],
        audience: jwtSection["Audience"],
        claims: claims,
        expires: DateTime.UtcNow.AddHours(12),
        signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}

int GetUserIdByEmail(IDbConnection db, string email)
{
    using var cmd = db.CreateCommand();
    cmd.CommandText = "SELECT Id FROM dbo.Users WHERE Email=@e";
    var p = cmd.CreateParameter();
    p.ParameterName = "@e";
    p.Value = email;
    cmd.Parameters.Add(p);
    var result = cmd.ExecuteScalar();
    if (result == null) throw new InvalidOperationException("User not found");
    return Convert.ToInt32(result);
}

app.MapPost("/api/auth/register", (RegisterRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        return Results.BadRequest("Email и пароль обязательны");

    using var db = new SqlConnection(connStr);
    db.Open();

    using (var check = db.CreateCommand())
    {
        check.CommandText = "SELECT COUNT(1) FROM dbo.Users WHERE Email=@e";
        var p = check.CreateParameter();
        p.ParameterName = "@e";
        p.Value = req.Email;
        check.Parameters.Add(p);
        var exists = (int)check.ExecuteScalar()!;
        if (exists > 0) return Results.Conflict("Пользователь уже существует");
    }

    var hash = BCrypt.Net.BCrypt.HashPassword(req.Password);
    using (var ins = db.CreateCommand())
    {
        ins.CommandText = "INSERT INTO dbo.Users(Email, PasswordHash) VALUES(@e,@h)";
        var p1 = ins.CreateParameter(); p1.ParameterName = "@e"; p1.Value = req.Email; ins.Parameters.Add(p1);
        var p2 = ins.CreateParameter(); p2.ParameterName = "@h"; p2.Value = hash; ins.Parameters.Add(p2);
        ins.ExecuteNonQuery();
    }

    var token = GenerateJwtToken(req.Email);
    return Results.Ok(new AuthResponse(token, req.Email));
});

app.MapPost("/api/auth/login", (LoginRequest req) =>
{
    using var db = new SqlConnection(connStr);
    db.Open();

    string? hash = null;
    using (var cmd = db.CreateCommand())
    {
        cmd.CommandText = "SELECT PasswordHash FROM dbo.Users WHERE Email=@e";
        var p = cmd.CreateParameter(); p.ParameterName = "@e"; p.Value = req.Email; cmd.Parameters.Add(p);
        var r = cmd.ExecuteScalar();
        hash = r as string;
    }
    if (hash == null || !BCrypt.Net.BCrypt.Verify(req.Password, hash))
        return Results.Unauthorized();

    var token = GenerateJwtToken(req.Email);
    return Results.Ok(new AuthResponse(token, req.Email));
});

app.MapGet("/api/menu", () =>
{
    using var db = new SqlConnection(connStr);
    db.Open();
    var items = new List<MenuItemDto>();
    using var cmd = db.CreateCommand();
    cmd.CommandText = "SELECT Id, Name, Description, PriceCents, DailyLimit FROM dbo.MenuItems ORDER BY Id";
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
        items.Add(new MenuItemDto(
            reader.GetInt32(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetString(2),
            reader.GetInt32(3),
            reader.GetInt32(4)
        ));
    }
    return Results.Ok(items);
});

app.MapGet("/api/menu/availability", (DateOnly date) =>
{
    using var db = new SqlConnection(connStr);
    db.Open();
    var result = new List<object>();
    using var cmd = db.CreateCommand();
    cmd.CommandText = @"SELECT mi.Id, mi.Name, mi.DailyLimit, ISNULL(SUM(p.Quantity),0) AS Ordered,
                               mi.DailyLimit - ISNULL(SUM(p.Quantity),0) AS Remaining
                        FROM dbo.MenuItems mi
                        LEFT JOIN dbo.Preorders p ON p.MenuItemId = mi.Id AND p.ForDate=@d
                        GROUP BY mi.Id, mi.Name, mi.DailyLimit
                        ORDER BY mi.Id";
    var pd = cmd.CreateParameter(); pd.ParameterName = "@d"; pd.Value = date.ToDateTime(TimeOnly.MinValue); cmd.Parameters.Add(pd);
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
        result.Add(new
        {
            MenuItemId = reader.GetInt32(0),
            Name = reader.GetString(1),
            DailyLimit = reader.GetInt32(2),
            Ordered = reader.GetInt32(3),
            Remaining = reader.GetInt32(4)
        });
    }
    return Results.Ok(result);
});

app.MapPost("/api/preorders", [Authorize] (PreorderRequest req, ClaimsPrincipal user) =>
{
    var email = user.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
    if (email is null) return Results.Unauthorized();

    using var db = new SqlConnection(connStr);
    db.Open();

    int dailyLimit = 0; int ordered = 0;
    using (var check = db.CreateCommand())
    {
        check.CommandText = @"SELECT mi.DailyLimit, ISNULL(SUM(p.Quantity),0)
                              FROM dbo.MenuItems mi
                              LEFT JOIN dbo.Preorders p
                                ON p.MenuItemId = mi.Id AND p.ForDate=@d
                              WHERE mi.Id=@id
                              GROUP BY mi.DailyLimit";
        var p1 = check.CreateParameter(); p1.ParameterName = "@d"; p1.Value = req.ForDate.ToDateTime(TimeOnly.MinValue); check.Parameters.Add(p1);
        var p2 = check.CreateParameter(); p2.ParameterName = "@id"; p2.Value = req.MenuItemId; check.Parameters.Add(p2);
        using var rd = check.ExecuteReader();
        if (!rd.Read()) return Results.NotFound("Блюдо не найдено");
        dailyLimit = rd.GetInt32(0);
        ordered = rd.GetInt32(1);
    }

    if (ordered + req.Quantity > dailyLimit)
        return Results.BadRequest("Нельзя заказать: превышен дневной лимит блюда");

    var userId = GetUserIdByEmail(db, email);
    using (var ins = db.CreateCommand())
    {
        ins.CommandText = "INSERT INTO dbo.Preorders(UserId, MenuItemId, ForDate, Quantity) VALUES(@u,@m,@d,@q)";
        var p1 = ins.CreateParameter(); p1.ParameterName = "@u"; p1.Value = userId; ins.Parameters.Add(p1);
        var p2 = ins.CreateParameter(); p2.ParameterName = "@m"; p2.Value = req.MenuItemId; ins.Parameters.Add(p2);
        var p3 = ins.CreateParameter(); p3.ParameterName = "@d"; p3.Value = req.ForDate.ToDateTime(TimeOnly.MinValue); ins.Parameters.Add(p3);
        var p4 = ins.CreateParameter(); p4.ParameterName = "@q"; p4.Value = req.Quantity; ins.Parameters.Add(p4);
        ins.ExecuteNonQuery();
    }
    return Results.Ok(new { Message = "Предзаказ создан" });
});

app.MapPost("/api/reservations", [Authorize] (ReservationRequest req, ClaimsPrincipal user) =>
{
    var email = user.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
    if (email is null) return Results.Unauthorized();

    using var db = new SqlConnection(connStr);
    db.Open();

    using (var chk = db.CreateCommand())
    {
        chk.CommandText = @"SELECT COUNT(1)
                            FROM dbo.Reservations r
                            WHERE r.TableId=@t
                              AND r.ReservedAt < DATEADD(minute, @dur, @start)
                              AND DATEADD(minute, r.DurationMin, r.ReservedAt) > @start";
        var p1 = chk.CreateParameter(); p1.ParameterName = "@t"; p1.Value = req.TableId; chk.Parameters.Add(p1);
        var p2 = chk.CreateParameter(); p2.ParameterName = "@dur"; p2.Value = req.DurationMin; chk.Parameters.Add(p2);
        var p3 = chk.CreateParameter(); p3.ParameterName = "@start"; p3.Value = req.ReservedAtUtc; chk.Parameters.Add(p3);
        var exists = (int)chk.ExecuteScalar()!;
        if (exists > 0) return Results.Conflict("Столик уже забронирован на это время");
    }

    var userId = GetUserIdByEmail(db, email);
    using (var ins = db.CreateCommand())
    {
        ins.CommandText = "INSERT INTO dbo.Reservations(UserId, TableId, ReservedAt, DurationMin) VALUES(@u,@t,@s,@d)";
        var p1 = ins.CreateParameter(); p1.ParameterName = "@u"; p1.Value = userId; ins.Parameters.Add(p1);
        var p2 = ins.CreateParameter(); p2.ParameterName = "@t"; p2.Value = req.TableId; ins.Parameters.Add(p2);
        var p3 = ins.CreateParameter(); p3.ParameterName = "@s"; p3.Value = req.ReservedAtUtc; ins.Parameters.Add(p3);
        var p4 = ins.CreateParameter(); p4.ParameterName = "@d"; p4.Value = req.DurationMin; ins.Parameters.Add(p4);
        ins.ExecuteNonQuery();
    }

    return Results.Ok(new { Message = "Бронь создана" });
});

app.MapGet("/api/reservations", (int tableId, DateTime dateUtc) =>
{
    using var db = new SqlConnection(connStr);
    db.Open();
    var items = new List<object>();
    using var cmd = db.CreateCommand();
    cmd.CommandText = @"SELECT r.Id, r.TableId, r.ReservedAt, r.DurationMin
                        FROM dbo.Reservations r
                        WHERE r.TableId=@t AND CAST(r.ReservedAt AS DATE)=CAST(@d AS DATE)
                        ORDER BY r.ReservedAt";
    var p1 = cmd.CreateParameter(); p1.ParameterName = "@t"; p1.Value = tableId; cmd.Parameters.Add(p1);
    var p2 = cmd.CreateParameter(); p2.ParameterName = "@d"; p2.Value = dateUtc; cmd.Parameters.Add(p2);
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
        items.Add(new
        {
            Id = reader.GetInt32(0),
            TableId = reader.GetInt32(1),
            ReservedAt = reader.GetDateTime(2),
            DurationMin = reader.GetInt32(3)
        });
    }
    return Results.Ok(items);
});

app.Run();

record RegisterRequest(string Email, string Password);
record LoginRequest(string Email, string Password);
record AuthResponse(string Token, string Email);
record MenuItemDto(int Id, string Name, string? Description, int PriceCents, int DailyLimit);
record PreorderRequest(int MenuItemId, DateOnly ForDate, int Quantity);
record ReservationRequest(int TableId, DateTime ReservedAtUtc, int DurationMin);