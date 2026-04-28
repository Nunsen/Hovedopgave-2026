package com.example.hovedopgave.config;

import com.example.hovedopgave.model.ActivationCode;
import com.example.hovedopgave.model.Booking;
import com.example.hovedopgave.model.Comment;
import com.example.hovedopgave.model.CommunityGroup;
import com.example.hovedopgave.model.Facility;
import com.example.hovedopgave.model.Faq;
import com.example.hovedopgave.model.GroupMember;
import com.example.hovedopgave.model.GroupMessage;
import com.example.hovedopgave.model.Post;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.ActivationCodeRepository;
import com.example.hovedopgave.repository.BookingRepository;
import com.example.hovedopgave.repository.CommentRepository;
import com.example.hovedopgave.repository.CommunityGroupRepository;
import com.example.hovedopgave.repository.FacilityRepository;
import com.example.hovedopgave.repository.FaqRepository;
import com.example.hovedopgave.repository.GroupMemberRepository;
import com.example.hovedopgave.repository.GroupMessageRepository;
import com.example.hovedopgave.repository.PostRepository;
import com.example.hovedopgave.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Configuration
public class DummyData {

    @Bean
    CommandLineRunner initData(
            UserRepository userRepository,
            ActivationCodeRepository activationCodeRepository,
            FacilityRepository facilityRepository,
            BookingRepository bookingRepository,
            PostRepository postRepository,
            CommentRepository commentRepository,
            CommunityGroupRepository communityGroupRepository,
            GroupMemberRepository groupMemberRepository,
            GroupMessageRepository groupMessageRepository,
            FaqRepository faqRepository
    ) {
        return args -> {
            if (userRepository.count() > 0) {
                return;
            }

            User resident = new User();
            resident.setFirstName("Anna");
            resident.setLastName("Jensen");
            resident.setEmail("anna.jensen@example.com");
            resident.setPhoneNumber("+45 20 30 40 50");
            resident.setBirthDate(LocalDate.of(1994, 3, 18));
            resident.setApartmentNumber("2B");
            resident.setPasswordHash("demo-hash-anna");
            resident.setRole("RESIDENT");
            resident = userRepository.save(resident);

            User boardMember = new User();
            boardMember.setFirstName("Mikkel");
            boardMember.setLastName("Nielsen");
            boardMember.setEmail("mikkel.nielsen@example.com");
            boardMember.setPhoneNumber("+45 60 70 80 90");
            boardMember.setBirthDate(LocalDate.of(1988, 9, 7));
            boardMember.setApartmentNumber("1A");
            boardMember.setPasswordHash("demo-hash-mikkel");
            boardMember.setRole("ADMIN");
            boardMember = userRepository.save(boardMember);

            ActivationCode activationCode = new ActivationCode();
            activationCode.setCode("WELCOME-2026");
            activationCode.setIsUsed(false);
            activationCode.setExpirationDate(LocalDateTime.now().plusDays(14));
            activationCode.setUser(resident);
            activationCodeRepository.save(activationCode);

            Facility laundry = new Facility();
            laundry.setName("Laundry Room 1");
            laundry.setType("LAUNDRY");
            laundry.setStatus("AVAILABLE");
            laundry = facilityRepository.save(laundry);

            Facility gym = new Facility();
            gym.setName("Fitness Room");
            gym.setType("GYM");
            gym.setStatus("OPEN");
            gym = facilityRepository.save(gym);

            Booking booking = new Booking();
            booking.setUser(resident);
            booking.setFacility(laundry);
            booking.setDate(LocalDate.now().plusDays(1));
            booking.setStartTime(LocalTime.of(18, 0));
            booking.setEndTime(LocalTime.of(20, 0));
            booking.setStatus("CONFIRMED");
            booking.setCreatedAt(LocalDateTime.now());
            bookingRepository.save(booking);

            Post post = new Post();
            post.setUser(boardMember);
            post.setTitle("Water shutdown on Friday");
            post.setContent("Water will be unavailable from 10:00 to 12:00 due to maintenance.");
            post.setIsImportant(true);
            post.setCreatedAt(LocalDateTime.now().minusHours(4));
            post = postRepository.save(post);

            Comment comment = new Comment();
            comment.setPost(post);
            comment.setUser(resident);
            comment.setContent("Thanks for the notice. Will the laundry room still be open?");
            comment.setCreatedAt(LocalDateTime.now().minusHours(2));
            commentRepository.save(comment);

            CommunityGroup group = new CommunityGroup();
            group.setName("Building A Residents");
            group.setDescription("Shared updates and practical coordination for Building A.");
            group.setType("RESIDENT");
            group.setCreatedBy(boardMember);
            group.setCreatedAt(LocalDateTime.now().minusDays(10));
            group = communityGroupRepository.save(group);

            GroupMember groupMember = new GroupMember();
            groupMember.setGroup(group);
            groupMember.setUser(resident);
            groupMember.setRoleInGroup("MEMBER");
            groupMember.setJoinedAt(LocalDateTime.now().minusDays(7));
            groupMemberRepository.save(groupMember);

            GroupMessage groupMessage = new GroupMessage();
            groupMessage.setGroup(group);
            groupMessage.setUser(boardMember);
            groupMessage.setMessage("Reminder: bike storage cleanup is this weekend.");
            groupMessage.setSentAt(LocalDateTime.now().minusDays(1));
            groupMessageRepository.save(groupMessage);

            Faq faq = new Faq();
            faq.setQuestion("How do I book the laundry room?");
            faq.setAnswer("Open the app, select a free timeslot, and confirm the booking.");
            faq.setCategory("Booking");
            faqRepository.save(faq);

        };
    }
}
