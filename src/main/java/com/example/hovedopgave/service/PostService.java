package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.PostCreateRequest;
import com.example.hovedopgave.dto.PostResponse;
import com.example.hovedopgave.model.Post;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.PostRepository;
import com.example.hovedopgave.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PostService {

    private static final List<String> ALLOWED_CATEGORIES = List.of("Begivenhed", "Generelt", "Vigtig info");

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public PostService(PostRepository postRepository, UserRepository userRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    public List<PostResponse> getPosts() {
        return postRepository.findAllByOrderByIsImportantDescCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public PostResponse createPost(PostCreateRequest request) {
        Map<String, String> fieldErrors = validateCreateRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new PostValidationException("Udfyld opslaget korrekt.", fieldErrors);
        }

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new PostValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));

        Post post = new Post();
        post.setUser(user);
        post.setTitle(request.title().trim());
        post.setContent(request.content().trim());
        post.setCategory(request.category().trim());
        post.setIcon(request.icon().trim());
        post.setIsImportant(Boolean.TRUE.equals(request.pinned()));
        post.setEventDate(parseEventDate(request.eventDate()));
        post.setCreatedAt(java.time.LocalDateTime.now());

        Post savedPost = postRepository.save(post);
        return toResponse(savedPost);
    }

    private Map<String, String> validateCreateRequest(PostCreateRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        if (request.userId() == null) {
            fieldErrors.put("userId", "Bruger-id er obligatorisk.");
        }

        String title = normalize(request.title());
        String content = normalize(request.content());
        String category = normalize(request.category());
        String icon = normalize(request.icon());
        String eventDate = normalize(request.eventDate());

        if (title == null) {
            fieldErrors.put("title", "Titel er obligatorisk.");
        } else if (title.length() > 100) {
            fieldErrors.put("title", "Titel maa hoejst vaere 100 tegn.");
        }

        if (content == null) {
            fieldErrors.put("content", "Indhold er obligatorisk.");
        } else if (content.length() > 1000) {
            fieldErrors.put("content", "Indhold maa hoejst vaere 1000 tegn.");
        }

        if (category == null) {
            fieldErrors.put("category", "Kategori er obligatorisk.");
        } else if (!ALLOWED_CATEGORIES.contains(category)) {
            fieldErrors.put("category", "Vaelg en gyldig kategori.");
        }

        if (icon == null) {
            fieldErrors.put("icon", "Ikon er obligatorisk.");
        }

        if (eventDate != null && !isValidDate(eventDate)) {
            fieldErrors.put("eventDate", "Brug formatet AAAA-MM-DD.");
        }

        if ("Begivenhed".equals(category) && eventDate == null) {
            fieldErrors.put("eventDate", "Dato for begivenhed er obligatorisk for begivenheder.");
        }

        if (request.pinned() == null) {
            fieldErrors.put("pinned", "Vaelg om opslaget skal fastgoeres.");
        }

        return fieldErrors;
    }

    private boolean isValidDate(String value) {
        try {
            LocalDate.parse(value);
            return true;
        } catch (DateTimeParseException exception) {
            return false;
        }
    }

    private LocalDate parseEventDate(String eventDate) {
        String normalizedValue = normalize(eventDate);
        return normalizedValue == null ? null : LocalDate.parse(normalizedValue);
    }

    private PostResponse toResponse(Post post) {
        return new PostResponse(
                post.getPostId(),
                post.getUser() != null ? post.getUser().getUserId() : null,
                post.getTitle(),
                post.getContent(),
                post.getCategory(),
                post.getIcon(),
                post.getEventDate() != null ? post.getEventDate().toString() : null,
                post.getCreatedAt() != null ? post.getCreatedAt().toString() : null,
                Boolean.TRUE.equals(post.getPinned())
        );
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }

    public static class PostValidationException extends RuntimeException {
        private final Map<String, String> fieldErrors;

        public PostValidationException(String message, Map<String, String> fieldErrors) {
            super(message);
            this.fieldErrors = fieldErrors;
        }

        public Map<String, String> getFieldErrors() {
            return fieldErrors;
        }
    }
}
