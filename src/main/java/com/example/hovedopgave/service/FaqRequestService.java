package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.DashboardUserResponse;
import com.example.hovedopgave.dto.FaqRequestCreateRequest;
import com.example.hovedopgave.dto.FaqRequestResponse;
import com.example.hovedopgave.dto.FaqRequestStatusUpdateRequest;
import com.example.hovedopgave.model.FaqRequest;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.FaqRequestRepository;
import com.example.hovedopgave.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class FaqRequestService {
    private static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    private static final String STATUS_DONE = "DONE";
    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
            "Akutte problemer",
            "Facilitetsproblemer",
            "Støj og adfærd",
            "Rengøring",
            "Teknisk/app",
            "Forslag og feedback",
            "Andet"
    );

    private final FaqRequestRepository faqRequestRepository;
    private final UserRepository userRepository;

    public FaqRequestService(FaqRequestRepository faqRequestRepository, UserRepository userRepository) {
        this.faqRequestRepository = faqRequestRepository;
        this.userRepository = userRepository;
    }

    public List<FaqRequestResponse> getRequests() {
        return faqRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public FaqRequestResponse createRequest(FaqRequestCreateRequest request) {
        Map<String, String> fieldErrors = validateCreateRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new FaqRequestValidationException("Kunne ikke oprette henvendelsen.", fieldErrors);
        }

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new FaqRequestValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));

        FaqRequest faqRequest = new FaqRequest();
        faqRequest.setUser(user);
        faqRequest.setCategory(request.category().trim());
        faqRequest.setTitle(request.title().trim());
        faqRequest.setDescription(request.description().trim());
        faqRequest.setContactEmail(user.getEmail());
        faqRequest.setStatus(STATUS_IN_PROGRESS);
        faqRequest.setCreatedAt(LocalDateTime.now());

        return toResponse(faqRequestRepository.save(faqRequest));
    }

    @Transactional
    public FaqRequestResponse updateStatus(Integer faqRequestId, FaqRequestStatusUpdateRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (faqRequestId == null) {
            fieldErrors.put("faqRequestId", "Henvendelses-id er obligatorisk.");
        }

        String normalizedStatus = request == null ? null : normalize(request.status());
        if (normalizedStatus == null) {
            fieldErrors.put("status", "Status er obligatorisk.");
        } else if (!Set.of(STATUS_IN_PROGRESS, STATUS_DONE).contains(normalizedStatus)) {
            fieldErrors.put("status", "Status skal være IN_PROGRESS eller DONE.");
        }

        if (!fieldErrors.isEmpty()) {
            throw new FaqRequestValidationException("Kunne ikke opdatere henvendelsen.", fieldErrors);
        }

        FaqRequest faqRequest = faqRequestRepository.findById(faqRequestId)
                .orElseThrow(() -> new FaqRequestValidationException(
                        "Henvendelsen findes ikke.",
                        Map.of("faqRequestId", "Der findes ingen henvendelse med dette id.")
                ));

        faqRequest.setStatus(normalizedStatus);
        return toResponse(faqRequestRepository.save(faqRequest));
    }

    private Map<String, String> validateCreateRequest(FaqRequestCreateRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        if (request.userId() == null) {
            fieldErrors.put("userId", "Bruger-id er obligatorisk.");
        }

        String category = normalize(request.category());
        String title = normalize(request.title());
        String description = normalize(request.description());

        if (category == null) {
            fieldErrors.put("category", "Kategori er obligatorisk.");
        } else if (!ALLOWED_CATEGORIES.contains(category)) {
            fieldErrors.put("category", "Vælg en gyldig kategori.");
        }

        if (title == null) {
            fieldErrors.put("title", "Overskrift er obligatorisk.");
        } else if (title.length() > 120) {
            fieldErrors.put("title", "Overskrift må højst være 120 tegn.");
        }

        if (description == null) {
            fieldErrors.put("description", "Beskrivelse er obligatorisk.");
        } else if (description.length() > 500) {
            fieldErrors.put("description", "Beskrivelse må højst være 500 tegn.");
        }

        return fieldErrors;
    }

    private FaqRequestResponse toResponse(FaqRequest faqRequest) {
        User user = faqRequest.getUser();

        DashboardUserResponse dashboardUser = user == null
                ? null
                : new DashboardUserResponse(
                user.getUserId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getApartmentNumber(),
                user.getIsActivated(),
                user.getRole()
        );

        return new FaqRequestResponse(
                faqRequest.getFaqRequestId(),
                dashboardUser,
                faqRequest.getCategory(),
                faqRequest.getTitle(),
                faqRequest.getDescription(),
                faqRequest.getContactEmail(),
                faqRequest.getStatus(),
                faqRequest.getCreatedAt() != null ? faqRequest.getCreatedAt().toString() : null
        );
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static class FaqRequestValidationException extends RuntimeException {
        private final Map<String, String> fieldErrors;

        public FaqRequestValidationException(String message, Map<String, String> fieldErrors) {
            super(message);
            this.fieldErrors = fieldErrors;
        }

        public Map<String, String> getFieldErrors() {
            return fieldErrors;
        }
    }
}
