package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.*;
import com.example.hovedopgave.model.CommunityGroup;
import com.example.hovedopgave.model.Post;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
public class UserService {

    private static final String DEFAULT_ROLE = "RESIDENT";

    private final UserRepository userRepository;
    private final ActivationCodeRepository activationCodeRepository;
    private final BookingRepository bookingRepository;
    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final PostParticipationRepository postParticipationRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final CommunityGroupRepository communityGroupRepository;

    public UserService(
            UserRepository userRepository,
            ActivationCodeRepository activationCodeRepository,
            BookingRepository bookingRepository,
            CommentRepository commentRepository,
            PostRepository postRepository,
            PostParticipationRepository postParticipationRepository,
            GroupMemberRepository groupMemberRepository,
            GroupMessageRepository groupMessageRepository,
            CommunityGroupRepository communityGroupRepository
    ) {
        this.userRepository = userRepository;
        this.activationCodeRepository = activationCodeRepository;
        this.bookingRepository = bookingRepository;
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.postParticipationRepository = postParticipationRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupMessageRepository = groupMessageRepository;
        this.communityGroupRepository = communityGroupRepository;
    }

    public UserRegistrationResponse registerUser(UserRegistrationRequest request) {
        Map<String, String> fieldErrors = validateRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new UserValidationException("Udfyld de obligatoriske felter korrekt.", fieldErrors);
        }

        NameParts nameParts = splitFullName(request.fullName().trim());

        User user = new User();
        user.setFirstName(nameParts.firstName());
        user.setLastName(nameParts.lastName());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPhoneNumber(request.phoneNumber().trim());
        user.setBirthDate(LocalDate.parse(request.birthDate().trim()));
        user.setApartmentNumber(request.apartmentNumber().trim());
        user.setPasswordHash(hashPassword(request.password()));
        user.setIsActivated(false);
        user.setRole(DEFAULT_ROLE);

        User savedUser = userRepository.save(user);

        return new UserRegistrationResponse(
                savedUser.getUserId(),
                request.fullName().trim(),
                savedUser.getEmail(),
                "SCAN_ACTIVATION_CODE"
        );
    }

    public UserLoginResponse loginUser(UserLoginRequest request) {
        Map<String, String> fieldErrors = validateLoginRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new UserValidationException("Indtast email og adgangskode.", fieldErrors);
        }

        User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new UserValidationException(
                        "Email eller adgangskode er forkert.",
                        Map.of("email", "Brugeren findes ikke.")
                ));

        if (!matchesPassword(request.password(), user.getPasswordHash())) {
            throw new UserValidationException(
                    "Email eller adgangskode er forkert.",
                    Map.of("password", "Adgangskoden er forkert.")
            );
        }

        return new UserLoginResponse(
                user.getUserId(),
                user.getFirstName() + " " + user.getLastName(),
                user.getEmail(),
                user.getRole(),
                "Login gennemfoert."
        );
    }

    public List<ChatUserSearchResponse> searchChatUsers(Integer userId, String query) {
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new UserValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));

        String normalizedQuery = normalize(query);
        String searchValue = normalizedQuery == null ? null : normalizedQuery.toLowerCase(Locale.ROOT);

        return userRepository.findAllByOrderByFirstNameAscLastNameAsc().stream()
                .filter(candidate -> !candidate.getUserId().equals(currentUser.getUserId()))
                .filter(candidate -> matchesChatSearch(candidate, searchValue))
                .sorted(Comparator.comparing(this::toFullName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toChatUserSearchResponse)
                .toList();
    }

    public UserResetPasswordResponse resetPassword(UserResetPasswordRequest request) {
        Map<String, String> fieldErrors = validateResetPasswordRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new UserValidationException("Indtast email og nyt kodeord korrekt.", fieldErrors);
        }

        User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new UserValidationException(
                        "Brugeren findes ikke.",
                        Map.of("email", "Der findes ingen bruger med denne email.")
                ));

        user.setPasswordHash(hashPassword(request.newPassword()));
        userRepository.save(user);

        return new UserResetPasswordResponse(
                user.getEmail(),
                "Adgangskoden er opdateret."
        );
    }

    public UserProfileResponse getUserProfile(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));

        return toUserProfileResponse(user);
    }

    public UserProfileResponse updateUserProfile(Integer userId, UserProfileUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));

        Map<String, String> fieldErrors = validateProfileUpdateRequest(request, user);

        if (!fieldErrors.isEmpty()) {
            throw new UserValidationException("Udfyld profiloplysningerne korrekt.", fieldErrors);
        }

        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPhoneNumber(request.phoneNumber().trim());
        user.setBirthDate(LocalDate.parse(request.birthDate().trim()));
        user.setApartmentNumber(request.apartmentNumber().trim());

        String nextPassword = normalize(request.password());
        if (nextPassword != null) {
            user.setPasswordHash(hashPassword(nextPassword));
        }

        User savedUser = userRepository.save(user);
        return toUserProfileResponse(savedUser);
    }

    @Transactional
    public void deleteUserProfile(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));

        activationCodeRepository.deleteAllByUserUserId(userId);
        bookingRepository.deleteAllByUserUserId(userId);
        commentRepository.deleteAllByUserUserId(userId);
        postParticipationRepository.deleteAllByUserUserId(userId);
        groupMemberRepository.deleteAllByUserUserId(userId);
        groupMessageRepository.deleteAllByUserUserId(userId);

        for (final Post post : postRepository.findAllByUserUserId(userId)) {
            commentRepository.deleteAllByPostPostId(post.getPostId());
            postParticipationRepository.deleteAllByPostPostId(post.getPostId());
            postRepository.delete(post);
        }

        for (final CommunityGroup group : communityGroupRepository.findAllByCreatedByUserId(userId)) {
            groupMessageRepository.deleteAllByGroupGroupId(group.getGroupId());
            groupMemberRepository.deleteAllByGroupGroupId(group.getGroupId());
            communityGroupRepository.delete(group);
        }

        userRepository.delete(user);
    }

    private Map<String, String> validateRequest(UserRegistrationRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        String fullName = normalize(request.fullName());
        String email = normalize(request.email());
        String phoneNumber = normalize(request.phoneNumber());
        String birthDate = normalize(request.birthDate());
        String apartmentNumber = normalize(request.apartmentNumber());
        String password = request.password();
        String confirmPassword = request.confirmPassword();

        if (fullName == null) {
            fieldErrors.put("fullName", "Fulde navn er obligatorisk.");
        } else if (!fullName.contains(" ")) {
            fieldErrors.put("fullName", "Indtast for- og efternavn.");
        }

        if (email == null) {
            fieldErrors.put("email", "Email er obligatorisk.");
        } else if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            fieldErrors.put("email", "Indtast en gyldig email.");
        } else if (this.userRepository.findByEmailIgnoreCase(email).isPresent()) {
            fieldErrors.put("email", "Der findes allerede en bruger med denne email.");
        }

        if (phoneNumber == null) {
            fieldErrors.put("phoneNumber", "Telefonnummer er obligatorisk.");
        } else if (!phoneNumber.matches("^[0-9+()\\-\\s]{8,15}$")) {
            fieldErrors.put("phoneNumber", "Indtast et gyldigt telefonnummer.");
        }

        if (birthDate == null) {
            fieldErrors.put("birthDate", "Foedselsdato er obligatorisk.");
        } else {
            try {
                LocalDate parsedBirthDate = LocalDate.parse(birthDate);
                if (parsedBirthDate.isAfter(LocalDate.now())) {
                    fieldErrors.put("birthDate", "Foedselsdato kan ikke ligge i fremtiden.");
                }
            } catch (DateTimeParseException exception) {
                fieldErrors.put("birthDate", "Foedselsdato skal have formatet AAAA-MM-DD.");
            }
        }

        if (apartmentNumber == null) {
            fieldErrors.put("apartmentNumber", "Lejlighedsnummer er obligatorisk.");
        }

        if (password == null || password.isBlank()) {
            fieldErrors.put("password", "Adgangskode er obligatorisk.");
        } else if (password.length() < 8) {
            fieldErrors.put("password", "Adgangskoden skal mindst vaere 8 tegn.");
        }

        if (confirmPassword == null || confirmPassword.isBlank()) {
            fieldErrors.put("confirmPassword", "Bekraeft adgangskode er obligatorisk.");
        } else if (password != null && !password.equals(confirmPassword)) {
            fieldErrors.put("confirmPassword", "Adgangskoderne matcher ikke.");
        }

        return fieldErrors;
    }

    private Map<String, String> validateProfileUpdateRequest(UserProfileUpdateRequest request, User currentUser) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        String firstName = normalize(request.firstName());
        String lastName = normalize(request.lastName());
        String email = normalize(request.email());
        String phoneNumber = normalize(request.phoneNumber());
        String birthDate = normalize(request.birthDate());
        String apartmentNumber = normalize(request.apartmentNumber());
        String password = normalize(request.password());
        String confirmPassword = normalize(request.confirmPassword());

        if (firstName == null) {
            fieldErrors.put("firstName", "Fornavn er obligatorisk.");
        }

        if (lastName == null) {
            fieldErrors.put("lastName", "Efternavn er obligatorisk.");
        }

        if (email == null) {
            fieldErrors.put("email", "Email er obligatorisk.");
        } else if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            fieldErrors.put("email", "Indtast en gyldig email.");
        } else {
            userRepository.findByEmailIgnoreCase(email)
                    .filter(existingUser -> !existingUser.getUserId().equals(currentUser.getUserId()))
                    .ifPresent(existingUser -> fieldErrors.put("email", "Der findes allerede en bruger med denne email."));
        }

        if (phoneNumber == null) {
            fieldErrors.put("phoneNumber", "Telefonnummer er obligatorisk.");
        } else if (!phoneNumber.matches("^[0-9+()\\-\\s]{8,15}$")) {
            fieldErrors.put("phoneNumber", "Indtast et gyldigt telefonnummer.");
        }

        if (birthDate == null) {
            fieldErrors.put("birthDate", "Foedselsdato er obligatorisk.");
        } else {
            try {
                LocalDate parsedBirthDate = LocalDate.parse(birthDate);
                if (parsedBirthDate.isAfter(LocalDate.now())) {
                    fieldErrors.put("birthDate", "Foedselsdato kan ikke ligge i fremtiden.");
                }
            } catch (DateTimeParseException exception) {
                fieldErrors.put("birthDate", "Foedselsdato skal have formatet AAAA-MM-DD.");
            }
        }

        if (apartmentNumber == null) {
            fieldErrors.put("apartmentNumber", "Lejlighedsnummer er obligatorisk.");
        }

        if (password != null || confirmPassword != null) {
            if (password == null) {
                fieldErrors.put("password", "Indtast nyt kodeord.");
            } else if (password.length() < 8) {
                fieldErrors.put("password", "Adgangskoden skal mindst vaere 8 tegn.");
            }

            if (confirmPassword == null) {
                fieldErrors.put("confirmPassword", "Bekraeft adgangskoden.");
            } else if (password != null && !password.equals(confirmPassword)) {
                fieldErrors.put("confirmPassword", "Adgangskoderne matcher ikke.");
            }
        }

        return fieldErrors;
    }

    private Map<String, String> validateLoginRequest(UserLoginRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        String email = normalize(request.email());
        String password = request.password();

        if (email == null) {
            fieldErrors.put("email", "Email er obligatorisk.");
        }

        if (password == null || password.isBlank()) {
            fieldErrors.put("password", "Adgangskode er obligatorisk.");
        }

        return fieldErrors;
    }

    private Map<String, String> validateResetPasswordRequest(UserResetPasswordRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        String email = normalize(request.email());
        String newPassword = request.newPassword();

        if (email == null) {
            fieldErrors.put("email", "Email er obligatorisk.");
        } else if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            fieldErrors.put("email", "Indtast en gyldig email.");
        }

        if (newPassword == null || newPassword.isBlank()) {
            fieldErrors.put("newPassword", "Nyt kodeord er obligatorisk.");
        } else if (newPassword.length() < 8) {
            fieldErrors.put("newPassword", "Det nye kodeord skal mindst vaere 8 tegn.");
        }

        return fieldErrors;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }

    private NameParts splitFullName(String fullName) {
        String[] parts = fullName.split("\\s+");
        if (parts.length == 1) {
            return new NameParts(parts[0], parts[0]);
        }

        String firstName = String.join(" ", java.util.Arrays.copyOf(parts, parts.length - 1));
        String lastName = parts[parts.length - 1];
        return new NameParts(firstName, lastName);
    }

    private UserProfileResponse toUserProfileResponse(User user) {
        String fullName = (user.getFirstName() + " " + user.getLastName()).trim();
        String birthDate = user.getBirthDate() != null ? user.getBirthDate().toString() : null;

        return new UserProfileResponse(
                user.getUserId(),
                user.getFirstName(),
                user.getLastName(),
                fullName,
                user.getEmail(),
                user.getPhoneNumber(),
                birthDate,
                user.getApartmentNumber(),
                "********"
        );
    }

    private boolean matchesChatSearch(User user, String searchValue) {
        if (searchValue == null) {
            return true;
        }

        return toFullName(user).toLowerCase(Locale.ROOT).contains(searchValue)
                || (user.getEmail() != null && user.getEmail().toLowerCase(Locale.ROOT).contains(searchValue))
                || (user.getApartmentNumber() != null
                && user.getApartmentNumber().toLowerCase(Locale.ROOT).contains(searchValue));
    }

    private ChatUserSearchResponse toChatUserSearchResponse(User user) {
        return new ChatUserSearchResponse(
                user.getUserId(),
                toFullName(user),
                toRoleLabel(user.getRole())
        );
    }

    private String toFullName(User user) {
        return (user.getFirstName() + " " + user.getLastName()).trim();
    }

    private String toRoleLabel(String role) {
        if (role == null) {
            return "Beboer";
        }

        if ("ADMIN".equalsIgnoreCase(role)) {
            return "Administrator";
        }

        return "Beboer";
    }

    private String hashPassword(String password) {
        try {
            MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");
            byte[] hashedBytes = messageDigest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();

            for (byte hashedByte : hashedBytes) {
                builder.append(String.format("%02x", hashedByte));
            }

            return builder.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Kunne ikke hashe adgangskoden.", exception);
        }
    }

    private boolean matchesPassword(String rawPassword, String storedHash) {
        if (rawPassword == null || storedHash == null) {
            return false;
        }

        if (hashPassword(rawPassword).equals(storedHash) || rawPassword.equals(storedHash)) {
            return true;
        }

        if (storedHash.startsWith("demo-hash-")) {
            String demoPassword = storedHash.substring("demo-hash-".length());
            return rawPassword.equalsIgnoreCase(demoPassword);
        }

        return false;
    }

    private record NameParts(String firstName, String lastName) {
    }

    public static class UserValidationException extends RuntimeException {
        private final Map<String, String> fieldErrors;

        public UserValidationException(String message, Map<String, String> fieldErrors) {
            super(message);
            this.fieldErrors = fieldErrors;
        }

        public Map<String, String> getFieldErrors() {
            return fieldErrors;
        }
    }
}
