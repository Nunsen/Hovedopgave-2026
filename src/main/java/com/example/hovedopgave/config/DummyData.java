package com.example.hovedopgave.config;

import com.example.hovedopgave.model.ActivationCode;
import com.example.hovedopgave.model.Booking;
import com.example.hovedopgave.model.CommunityGroup;
import com.example.hovedopgave.model.Facility;
import com.example.hovedopgave.model.GroupMember;
import com.example.hovedopgave.model.GroupMessage;
import com.example.hovedopgave.model.Post;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.ActivationCodeRepository;
import com.example.hovedopgave.repository.BookingRepository;
import com.example.hovedopgave.repository.CommunityGroupRepository;
import com.example.hovedopgave.repository.FacilityRepository;
import com.example.hovedopgave.repository.GroupMemberRepository;
import com.example.hovedopgave.repository.GroupMessageRepository;
import com.example.hovedopgave.repository.PostRepository;
import com.example.hovedopgave.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Configuration
public class DummyData {

    private static final Path BOOKINGS_RESET_MARKER = Path.of("data", "bookings-reset-v2.marker");

    @Bean
    CommandLineRunner seedData(
            ActivationCodeRepository activationCodeRepository,
            UserRepository userRepository,
            PostRepository postRepository,
            FacilityRepository facilityRepository,
            BookingRepository bookingRepository,
            CommunityGroupRepository communityGroupRepository,
            GroupMemberRepository groupMemberRepository,
            GroupMessageRepository groupMessageRepository
    ) {
        return args -> {

            Optional<User> firstUser = userRepository.findAll().stream().findFirst();
            if (firstUser.isEmpty()) {
                return;
            }

            User user = firstUser.get();

            Optional<ActivationCode> sharedActivationCode = activationCodeRepository.findByCodeIgnoreCase("HOVEDOPGAVE-QR-2026");

            if (sharedActivationCode.isEmpty()) {
                ActivationCode activationCode = new ActivationCode();
                activationCode.setCode("HOVEDOPGAVE-QR-2026");
                activationCode.setIsUsed(false);
                activationCode.setExpirationDate(LocalDateTime.now().plusYears(10));
                activationCode.setUser(user);
                activationCodeRepository.save(activationCode);
            } else {
                ActivationCode activationCode = sharedActivationCode.get();
                boolean hasChanges = false;

                if (activationCode.getUser() == null) {
                    activationCode.setUser(user);
                    hasChanges = true;
                }

                if (activationCode.getIsUsed() == null) {
                    activationCode.setIsUsed(false);
                    hasChanges = true;
                }

                if (hasChanges) {
                    activationCodeRepository.save(activationCode);
                }
            }

            if (postRepository.count() == 0) {
                postRepository.save(createPost(user,
                        "Vandafbrydelse i morgen",
                        "Der vil vare vandafbrydelse tirsdag d. 11/06 fra 08.00 til 14.00 pga. vedligeholdelse.",
                        "Vigtig info",
                        "bullhorn-outline",
                        true,
                        null,
                        null,
                        null,
                        null,
                        LocalDateTime.now().minusDays(1)
                ));

                postRepository.save(createPost(user,
                        "Sommerfest 2024",
                        "Saa er det tid til aarets sommerfest. Saet kryds i kalenderen loerdag d. 15/06.",
                        "Begivenhed",
                        "calendar-blank-outline",
                        false,
                        LocalDate.now().plusDays(14),
                        LocalTime.of(17, 0),
                        LocalTime.of(22, 0),
                        "Fællesgården",
                        LocalDateTime.now().minusDays(2)
                ));

                postRepository.save(createPost(user,
                        "Pakke til afhentning",
                        "Der er en pakke til dig i administrationen. Husk gyldigt ID ved afhentning.",
                        "Generelt",
                        "package-variant-closed",
                        false,
                        null,
                        null,
                        null,
                        null,
                        LocalDateTime.now().minusDays(3)
                ));

                postRepository.save(createPost(user,
                        "Rengøring af fællesomraader",
                        "Husk at hjælpe med at holde vores fællesområder rene og pæne.",
                        "Generelt",
                        "broom",
                        false,
                        null,
                        null,
                        null,
                        null,
                        LocalDateTime.now().minusDays(5)
                ));

                postRepository.save(createPost(user,
                        "Elevator ude af drift",
                        "Elevatoren forventes ude af drift til og med fredag d. 14/06.",
                        "Vigtig info",
                        "wrench-outline",
                        true,
                        null,
                        null,
                        null,
                        null,
                        LocalDateTime.now().minusDays(6)
                ));
            }

            resetBookingsOnce(bookingRepository);
            normalizeFacilities(facilityRepository, bookingRepository);
            seedChatGroups(user, communityGroupRepository, groupMemberRepository, groupMessageRepository);
        };
    }

    private void seedChatGroups(
            User user,
            CommunityGroupRepository communityGroupRepository,
            GroupMemberRepository groupMemberRepository,
            GroupMessageRepository groupMessageRepository
    ) {
        if (!communityGroupRepository.findAllByTypeIgnoreCaseOrderByCreatedAtDesc("CHAT").isEmpty()) {
            return;
        }

        CommunityGroup firstGroup = createGroup(
                communityGroupRepository,
                user,
                "Gang gruppe",
                "Faelles beskeder til naboer paa samme gang."
        );
        CommunityGroup secondGroup = createGroup(
                communityGroupRepository,
                user,
                "Stueetagen",
                "Koordinering mellem beboere i stueetagen."
        );
        CommunityGroup thirdGroup = createGroup(
                communityGroupRepository,
                user,
                "Beboerforening",
                "Praktiske beskeder og initiativer for alle beboere."
        );

        joinGroup(groupMemberRepository, firstGroup, user, "OWNER");
        joinGroup(groupMemberRepository, secondGroup, user, "OWNER");
        joinGroup(groupMemberRepository, thirdGroup, user, "OWNER");

        createGroupMessage(groupMessageRepository, firstGroup, user, "Velkommen til gruppen for gangen.");
        createGroupMessage(groupMessageRepository, secondGroup, user, "Her kan I koordinere praktiske ting.");
        createGroupMessage(groupMessageRepository, thirdGroup, user, "Brug gruppen til faelles information og dialog.");
    }

    private void resetBookingsOnce(BookingRepository bookingRepository) {
        if (Files.exists(BOOKINGS_RESET_MARKER)) {
            return;
        }

        bookingRepository.deleteAll();

        try {
            Path parent = BOOKINGS_RESET_MARKER.getParent();

            if (parent != null) {
                Files.createDirectories(parent);
            }

            Files.createFile(BOOKINGS_RESET_MARKER);
        } catch (IOException exception) {
            throw new UncheckedIOException("Kunne ikke oprette booking reset-markoer.", exception);
        }
    }

    private void normalizeFacilities(
            FacilityRepository facilityRepository,
            BookingRepository bookingRepository
    ) {
        List<Facility> existingFacilities = facilityRepository.findAll();

        Facility washingMachineOne = ensureFacility(
                existingFacilities,
                facilityRepository,
                Set.of("vaskemaskine 1", "laundry", "vaskeri", "laundry room 1"),
                Set.of("WASHING_ROOM", "LAUNDRY"),
                "Vaskemaskine 1",
                "WASHING_MACHINE"
        );

        Facility washingMachineTwo = ensureFacility(
                existingFacilities,
                facilityRepository,
                Set.of("vaskemaskine 2"),
                Set.of(),
                "Vaskemaskine 2",
                "WASHING_MACHINE"
        );

        Facility dryer = ensureFacility(
                existingFacilities,
                facilityRepository,
                Set.of("tørretumbler", "torretumbler"),
                Set.of(),
                "Tørretumbler",
                "DRYER"
        );

        Facility partyFacility = ensureFacility(
                existingFacilities,
                facilityRepository,
                Set.of("festsal"),
                Set.of("PARTY_ROOM", "FESTSAL"),
                "festsal",
                "PARTY_ROOM"
        );

        Set<Integer> allowedFacilityIds = Set.of(
                washingMachineOne.getFacilityId(),
                washingMachineTwo.getFacilityId(),
                dryer.getFacilityId(),
                partyFacility.getFacilityId()
        );

        List<Booking> legacyBookings = bookingRepository.findAll().stream()
                .filter(booking -> booking.getFacility() == null
                        || booking.getFacility().getFacilityId() == null
                        || !allowedFacilityIds.contains(booking.getFacility().getFacilityId()))
                .toList();

        if (!legacyBookings.isEmpty()) {
            bookingRepository.deleteAll(legacyBookings);
        }

        List<Facility> legacyFacilities = facilityRepository.findAll().stream()
                .filter(facility -> facility.getFacilityId() != null && !allowedFacilityIds.contains(facility.getFacilityId()))
                .collect(Collectors.toList());

        if (!legacyFacilities.isEmpty()) {
            facilityRepository.deleteAll(legacyFacilities);
        }
    }

    private Facility ensureFacility(
            List<Facility> existingFacilities,
            FacilityRepository facilityRepository,
            Set<String> names,
            Set<String> types,
            String targetName,
            String targetType
    ) {
        Facility facility = existingFacilities.stream()
                .filter(existingFacility -> matchesFacility(existingFacility, names, types))
                .findFirst()
                .orElseGet(Facility::new);

        facility.setName(targetName);
        facility.setType(targetType);
        facility.setStatus("ACTIVE");
        return facilityRepository.save(facility);
    }

    private boolean matchesFacility(Facility facility, Set<String> names, Set<String> types) {
        String facilityName = facility.getName() == null ? "" : facility.getName().trim().toLowerCase();
        String facilityType = facility.getType() == null ? "" : facility.getType().trim().toUpperCase();
        return names.contains(facilityName) || types.contains(facilityType);
    }

    private Post createPost(
            User user,
            String title,
            String content,
            String category,
            String icon,
            boolean pinned,
            LocalDate eventDate,
            LocalTime startTime,
            LocalTime endTime,
            String location,
            LocalDateTime createdAt
    ) {
        Post post = new Post();
        post.setUser(user);
        post.setTitle(title);
        post.setContent(content);
        post.setCategory(category);
        post.setIcon(icon);
        post.setIsImportant(pinned);
        post.setEventDate(eventDate);
        post.setStartTime(startTime);
        post.setEndTime(endTime);
        post.setLocation(location);
        post.setCreatedAt(createdAt);
        return post;
    }

    private CommunityGroup createGroup(
            CommunityGroupRepository communityGroupRepository,
            User user,
            String name,
            String description
    ) {
        CommunityGroup group = new CommunityGroup();
        group.setName(name);
        group.setDescription(description);
        group.setType("CHAT");
        group.setCreatedBy(user);
        group.setCreatedAt(LocalDateTime.now().minusDays(2));
        return communityGroupRepository.save(group);
    }

    private void joinGroup(
            GroupMemberRepository groupMemberRepository,
            CommunityGroup group,
            User user,
            String role
    ) {
        GroupMember groupMember = new GroupMember();
        groupMember.setGroup(group);
        groupMember.setUser(user);
        groupMember.setRoleInGroup(role);
        groupMember.setJoinedAt(LocalDateTime.now().minusDays(2));
        groupMemberRepository.save(groupMember);
    }

    private void createGroupMessage(
            GroupMessageRepository groupMessageRepository,
            CommunityGroup group,
            User user,
            String messageValue
    ) {
        GroupMessage message = new GroupMessage();
        message.setGroup(group);
        message.setUser(user);
        message.setMessage(messageValue);
        message.setSentAt(LocalDateTime.now().minusDays(1));
        groupMessageRepository.save(message);
    }
}
