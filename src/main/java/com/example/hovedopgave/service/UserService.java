package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.UserRegistrationRequest;
import com.example.hovedopgave.dto.UserRegistrationResponse;
import com.example.hovedopgave.dto.UserLoginRequest;
import com.example.hovedopgave.dto.UserLoginResponse;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class UserService {

    private static final String DEFAULT_ROLE = "RESIDENT";

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
                "Login gennemfoert."
        );
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
        } else if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
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
