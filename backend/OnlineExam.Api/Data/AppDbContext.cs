using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Models;

namespace OnlineExam.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Exam> Exams { get; set; }
    public DbSet<ExamAttempt> ExamAttempts { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<Term> Terms { get; set; }
    public DbSet<Course> Courses { get; set; }
    public DbSet<CourseOffering> CourseOfferings { get; set; }
    public DbSet<CourseOfferingStaffAssignment> CourseOfferingStaffAssignments { get; set; }
    public DbSet<SemesterEnrollment> SemesterEnrollments { get; set; }
    public DbSet<StudentCourseEnrollment> StudentCourseEnrollments { get; set; }
    public DbSet<CarryOverCourse> CarryOverCourses { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var adminCreatedAt = new DateTime(2026, 5, 9, 19, 13, 39, 246, DateTimeKind.Utc).AddTicks(6811);
        var professorCreatedAt = new DateTime(2026, 5, 9, 19, 13, 39, 246, DateTimeKind.Utc).AddTicks(6819);
        var studentCreatedAt = new DateTime(2026, 5, 9, 19, 13, 39, 246, DateTimeKind.Utc).AddTicks(6822);

        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = Guid.Parse("f9635e15-1d90-4e3b-b722-331a8fc2fbe9"),
                FullName = "Admin User",
                Email = "admin@onlineexam.com",
                PasswordHash = "Password123!",
                Role = "Admin",
                IsActive = true,
                CreatedAt = adminCreatedAt
            },
            new User
            {
                Id = Guid.Parse("b5769729-e575-4789-b6e7-f7327ede1acc"),
                FullName = "Professor",
                Email = "prof@onlineexam.com",
                PasswordHash = "Password123!",
                Role = "Professor",
                IsActive = true,
                CreatedAt = professorCreatedAt
            },
            new User
            {
                Id = Guid.Parse("4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1"),
                FullName = "Student",
                Email = "student@onlineexam.com",
                PasswordHash = "Password123!",
                Role = "Student",
                IsActive = true,
                CreatedAt = studentCreatedAt
            }
        );

        modelBuilder.Entity<Question>()
            .HasOne(q => q.Exam)
            .WithMany(e => e.Questions)
            .HasForeignKey(q => q.ExamId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ExamAttempt>()
            .HasOne(a => a.Exam)
            .WithMany(e => e.Attempts)
            .HasForeignKey(a => a.ExamId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ExamAttempt>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(a => a.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ExamAttempt>()
            .HasIndex(x => new { x.ExamId, x.StudentId })
            .IsUnique();

        modelBuilder.Entity<Term>()
            .HasIndex(x => x.Code)
            .IsUnique();

        modelBuilder.Entity<AuditLog>()
            .HasIndex(x => x.CreatedAt);

        modelBuilder.Entity<AuditLog>()
            .HasIndex(x => new { x.EntityType, x.EntityId });

        modelBuilder.Entity<Course>()
            .HasIndex(x => x.Code)
            .IsUnique();

        modelBuilder.Entity<CourseOffering>()
            .HasIndex(x => new { x.CourseId, x.TermId, x.SectionCode })
            .IsUnique();

        modelBuilder.Entity<StudentCourseEnrollment>()
            .HasIndex(x => new { x.StudentId, x.CourseOfferingId })
            .IsUnique();

        modelBuilder.Entity<CourseOffering>()
            .HasOne(x => x.Course)
            .WithMany(x => x.CourseOfferings)
            .HasForeignKey(x => x.CourseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CourseOffering>()
            .HasOne(x => x.Term)
            .WithMany(x => x.CourseOfferings)
            .HasForeignKey(x => x.TermId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CourseOfferingStaffAssignment>()
            .HasOne(x => x.CourseOffering)
            .WithMany(x => x.StaffAssignments)
            .HasForeignKey(x => x.CourseOfferingId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SemesterEnrollment>()
            .HasOne(x => x.Term)
            .WithMany(x => x.SemesterEnrollments)
            .HasForeignKey(x => x.TermId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StudentCourseEnrollment>()
            .HasOne(x => x.CourseOffering)
            .WithMany(x => x.StudentCourseEnrollments)
            .HasForeignKey(x => x.CourseOfferingId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StudentCourseEnrollment>()
            .HasOne(x => x.LinkedSemesterEnrollment)
            .WithMany(x => x.StudentCourseEnrollments)
            .HasForeignKey(x => x.LinkedSemesterEnrollmentId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<CarryOverCourse>()
            .HasOne(x => x.Course)
            .WithMany(x => x.CarryOverCourses)
            .HasForeignKey(x => x.CourseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CarryOverCourse>()
            .HasOne(x => x.OriginTerm)
            .WithMany()
            .HasForeignKey(x => x.OriginTermId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Exam>()
            .HasOne(x => x.CourseOffering)
            .WithMany(x => x.Exams)
            .HasForeignKey(x => x.CourseOfferingId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
