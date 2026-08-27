from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from users.models import UserRole
from sessions_app.models import Session, Booking, SessionStatus, BookingStatus

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds database with realistic creators, users, sessions, and sample bookings'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding Marketplace Database..."))

        # Create Creators
        creator1, _ = User.objects.get_or_create(
            email='creator.demo@ahoum.com',
            defaults={
                'username': 'elena_rostova',
                'first_name': 'Elena',
                'last_name': 'Rostova',
                'role': UserRole.CREATOR,
                'avatar_url': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
                'bio': 'Senior Distributed Systems Architect & High-Performance Database Consultant.',
                'oauth_provider': 'demo',
            }
        )
        creator1.set_password('creator123')
        creator1.role = UserRole.CREATOR
        creator1.save()

        creator2, _ = User.objects.get_or_create(
            email='creator.marcus@ahoum.com',
            defaults={
                'username': 'marcus_vance',
                'first_name': 'Dr. Marcus',
                'last_name': 'Vance',
                'role': UserRole.CREATOR,
                'avatar_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
                'bio': 'Principal AI Engineer specializing in large-scale LLM deployments and real-time agent architectures.',
                'oauth_provider': 'demo',
            }
        )
        creator2.set_password('creator123')
        creator2.role = UserRole.CREATOR
        creator2.save()

        # Create Standard Users
        user1, _ = User.objects.get_or_create(
            email='user.demo@ahoum.com',
            defaults={
                'username': 'alex_mercer',
                'first_name': 'Alex',
                'last_name': 'Mercer',
                'role': UserRole.USER,
                'avatar_url': 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
                'bio': 'Full-stack software developer eager to master backend concurrency and cloud native systems.',
                'oauth_provider': 'demo',
            }
        )
        user1.set_password('user123')
        user1.role = UserRole.USER
        user1.save()

        user2, _ = User.objects.get_or_create(
            email='user.jordan@ahoum.com',
            defaults={
                'username': 'jordan_lee',
                'first_name': 'Jordan',
                'last_name': 'Lee',
                'role': UserRole.USER,
                'avatar_url': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
                'bio': 'Frontend engineer leveling up distributed systems knowledge.',
                'oauth_provider': 'demo',
            }
        )
        user2.set_password('user123')
        user2.role = UserRole.USER
        user2.save()

        # Clear existing demo sessions for idempotency
        Session.objects.all().delete()

        now = timezone.now()

        # 1. High-Throughput Concurrency Masterclass
        s1 = Session.objects.create(
            title="High-Throughput Concurrency & Distributed Locking in PostgreSQL",
            description="Deep dive into pessimistic row-level locking (SELECT FOR UPDATE), transaction isolation levels, race condition prevention, and benchmark testing under concurrent loads.",
            creator=creator1,
            start_time=now + timedelta(days=1, hours=2),
            end_time=now + timedelta(days=1, hours=4),
            capacity=3,
            price=49.00,
            status=SessionStatus.ACTIVE
        )

        # 2. Modern React 19 & DRF Architecture
        s2 = Session.objects.create(
            title="Modern Full-Stack Architecture with React & Django REST Framework",
            description="Explore clean separation of concerns, JWT lifecycle with refresh rotation, optimistic UI state management, and production Docker containerization.",
            creator=creator1,
            start_time=now + timedelta(days=2, hours=5),
            end_time=now + timedelta(days=2, hours=7),
            capacity=5,
            price=29.00,
            status=SessionStatus.ACTIVE
        )

        # 3. LLM Agent Orchestration & Production Deployment
        s3 = Session.objects.create(
            title="Production LLM Agents: Tool Calling, Context Windows, and State Machines",
            description="Hands-on workshop on building deterministic agentic workflows, function execution sandboxing, and resilient background task pipelines.",
            creator=creator2,
            start_time=now + timedelta(days=3, hours=1),
            end_time=now + timedelta(days=3, hours=3),
            capacity=2,
            price=79.00,
            status=SessionStatus.ACTIVE
        )

        # 4. Single-Seat Exclusive Mentorship (Perfect for 1-seat race condition demo)
        s4 = Session.objects.create(
            title="Exclusive 1-on-1 Distributed Systems Code Review & Mentorship",
            description="Exclusive single-seat session reserved for a deep dive into your architecture design, code review, and performance bottleneck resolution.",
            creator=creator1,
            start_time=now + timedelta(days=1, hours=8),
            end_time=now + timedelta(days=1, hours=9),
            capacity=1,
            price=99.00,
            status=SessionStatus.ACTIVE
        )

        # 5. Past Session (For edge case testing)
        s5 = Session.objects.create(
            title="[Archive] System Design Primer: Building Resilient Microservices",
            description="Historical session recording covering idempotency keys, exponential backoff retries, and dead letter queues.",
            creator=creator2,
            start_time=now - timedelta(days=2),
            end_time=now - timedelta(days=2, hours=-2),
            capacity=10,
            price=19.00,
            status=SessionStatus.ACTIVE
        )

        # Create a sample confirmed booking
        Booking.objects.create(
            session=s1,
            user=user2,
            status=BookingStatus.CONFIRMED
        )

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded database:\n"
            f" - {User.objects.count()} users/creators\n"
            f" - {Session.objects.count()} sessions\n"
            f" - {Booking.objects.count()} bookings\n"
            f"Demo credentials ready!"
        ))
