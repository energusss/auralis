using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Auralis.Infrastructure.Migrations;

public partial class AddGoogleIdentity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "GoogleSubject", table: "Users", type: "character varying(255)", maxLength: 255, nullable: true);
        migrationBuilder.CreateIndex(name: "IX_Users_GoogleSubject", table: "Users", column: "GoogleSubject", unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Users_GoogleSubject", table: "Users");
        migrationBuilder.DropColumn(name: "GoogleSubject", table: "Users");
    }
}
