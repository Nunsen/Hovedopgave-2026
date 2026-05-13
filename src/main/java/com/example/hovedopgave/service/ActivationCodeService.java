package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.ActivationCodeRequest;
import com.example.hovedopgave.dto.ActivationCodeResponse;
import com.example.hovedopgave.model.ActivationCode;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.ActivationCodeRepository;
import com.example.hovedopgave.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ActivationCodeService {

    private final ActivationCodeRepository activationCodeRepository;
    private final UserRepository userRepository;

    public ActivationCodeService(ActivationCodeRepository activationCodeRepository, UserRepository userRepository) {
        this.activationCodeRepository = activationCodeRepository;
        this.userRepository = userRepository;
    }

    public ActivationCodeResponse activateUser(ActivationCodeRequest request) {
        Map<String, String> fieldErrors = validateRequest(request);
        if (!fieldErrors.isEmpty()) {
            throw new ActivationCodeValidationException("Aktiveringskoden kunne ikke godkendes.", fieldErrors);
        }

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ActivationCodeValidationException(
                        "Brugeren blev ikke fundet.",
                        Map.of("userId", "Bruger-id er ugyldigt.")
                ));

        ActivationCode activationCode = activationCodeRepository.findByCodeIgnoreCase(request.code().trim())
                .orElseThrow(() -> new ActivationCodeValidationException(
                        "Aktiveringskoden blev ikke fundet.",
                        Map.of("code", "QR-koden er ugyldig.")
                ));

        //if (Boolean.TRUE.equals(activationCode.getIsUsed())) {
        //    throw new ActivationCodeValidationException(
        //            "Aktiveringskoden er allerede brugt.",
        //            Map.of("code", "QR-koden er allerede brugt.")
        //    );
        //}

        if (activationCode.getExpirationDate().isBefore(LocalDateTime.now())) {
            throw new ActivationCodeValidationException(
                    "Aktiveringskoden er udløbet.",
                    Map.of("code", "QR-koden er udløbet.")
            );
        }

        user.setIsActivated(true);

        userRepository.save(user);

        return new ActivationCodeResponse(
                user.getUserId(),
                (user.getFirstName() + " " + user.getLastName()).trim(),
                user.getEmail(),
                user.getRole(),
                activationCode.getCode(),
                true,
                "Brugeren er nu aktiveret."
        );
    }

    private Map<String, String> validateRequest(ActivationCodeRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        if (request.userId() == null) {
            fieldErrors.put("userId", "Bruger-id er obligatorisk.");
        }

        if (request.code() == null || request.code().trim().isEmpty()) {
            fieldErrors.put("code", "Aktiveringskode er obligatorisk.");
        }

        return fieldErrors;
    }

    public static class ActivationCodeValidationException extends RuntimeException {
        private final Map<String, String> fieldErrors;

        public ActivationCodeValidationException(String message, Map<String, String> fieldErrors) {
            super(message);
            this.fieldErrors = fieldErrors;
        }

        public Map<String, String> getFieldErrors() {
            return fieldErrors;
        }
    }
}
