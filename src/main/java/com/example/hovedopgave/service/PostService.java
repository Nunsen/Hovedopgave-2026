package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.CommentCreateRequest;
import com.example.hovedopgave.dto.CommentResponse;
import com.example.hovedopgave.dto.PostCreateRequest;
import com.example.hovedopgave.dto.PostParticipationRequest;
import com.example.hovedopgave.dto.PostResponse;
import com.example.hovedopgave.model.Comment;
import com.example.hovedopgave.model.Post;
import com.example.hovedopgave.model.PostParticipation;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.CommentRepository;
import com.example.hovedopgave.repository.PostParticipationRepository;
import com.example.hovedopgave.repository.PostRepository;
import com.example.hovedopgave.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PostService {

    private static final List<String> ALLOWED_CATEGORIES = List.of("Begivenhed", "Generelt", "Vigtig info");

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostParticipationRepository postParticipationRepository;
    private final UserRepository userRepository;

    public PostService(
            PostRepository postRepository,
            CommentRepository commentRepository,
            PostParticipationRepository postParticipationRepository,
            UserRepository userRepository
    ) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.postParticipationRepository = postParticipationRepository;
        this.userRepository = userRepository;
    }

    public List<PostResponse> getPosts() {
        return postRepository.findAllByOrderByIsImportantDescCreatedAtDesc()
                .stream()
                .map(post -> toResponse(post, null))
                .toList();
    }

    public PostResponse getPostById(Integer postId, Integer userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostValidationException(
                        "Opslaget findes ikke.",
                        Map.of("postId", "Der findes intet opslag med dette id.")
                ));

        return toResponse(post, userId);
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
        return toResponse(savedPost, user.getUserId());
    }

    public PostResponse updateParticipation(Integer postId, PostParticipationRequest request) {
        Map<String, String> fieldErrors = validateParticipationRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new PostValidationException("Udfyld deltagelse korrekt.", fieldErrors);
        }

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostValidationException(
                        "Opslaget findes ikke.",
                        Map.of("postId", "Der findes intet opslag med dette id.")
                ));

        if (!"Begivenhed".equals(post.getCategory())) {
            throw new PostValidationException(
                    "Kun begivenheder kan have deltagere.",
                    Map.of("postId", "Dette opslag er ikke en begivenhed.")
            );
        }

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new PostValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));

        PostParticipation participation = postParticipationRepository
                .findByPostPostIdAndUserUserId(postId, request.userId())
                .orElseGet(() -> {
                    PostParticipation newParticipation = new PostParticipation();
                    newParticipation.setPost(post);
                    newParticipation.setUser(user);
                    return newParticipation;
                });

        participation.setIsAttending(Boolean.TRUE.equals(request.attending()));
        participation.setUpdatedAt(LocalDateTime.now());
        postParticipationRepository.save(participation);

        return toResponse(post, user.getUserId());
    }

    public PostResponse createComment(Integer postId, CommentCreateRequest request) {
        Map<String, String> fieldErrors = validateCommentRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new PostValidationException("Udfyld kommentaren korrekt.", fieldErrors);
        }

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostValidationException(
                        "Opslaget findes ikke.",
                        Map.of("postId", "Der findes intet opslag med dette id.")
                ));

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new PostValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setUser(user);
        comment.setContent(request.content().trim());
        comment.setCreatedAt(LocalDateTime.now());
        commentRepository.save(comment);

        return toResponse(post, user.getUserId());
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

    private Map<String, String> validateParticipationRequest(PostParticipationRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        if (request.userId() == null) {
            fieldErrors.put("userId", "Bruger-id er obligatorisk.");
        }

        if (request.attending() == null) {
            fieldErrors.put("attending", "Vaelg om brugeren deltager.");
        }

        return fieldErrors;
    }

    private Map<String, String> validateCommentRequest(CommentCreateRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        if (request.userId() == null) {
            fieldErrors.put("userId", "Bruger-id er obligatorisk.");
        }

        String content = normalize(request.content());

        if (content == null) {
            fieldErrors.put("content", "Kommentar er obligatorisk.");
        } else if (content.length() > 500) {
            fieldErrors.put("content", "Kommentar maa hoejst vaere 500 tegn.");
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

    private PostResponse toResponse(Post post, Integer currentUserId) {
        long participantCount = "Begivenhed".equals(post.getCategory())
                ? postParticipationRepository.countByPostPostIdAndIsAttendingTrue(post.getPostId())
                : 0;

        Boolean attending = null;

        if (currentUserId != null && "Begivenhed".equals(post.getCategory())) {
            attending = postParticipationRepository
                    .findByPostPostIdAndUserUserId(post.getPostId(), currentUserId)
                    .map(PostParticipation::getIsAttending)
                    .orElse(false);
        }

        List<CommentResponse> comments = commentRepository.findAllByPostPostIdOrderByCreatedAtAsc(post.getPostId())
                .stream()
                .map(this::toCommentResponse)
                .toList();

        return new PostResponse(
                post.getPostId(),
                post.getUser() != null ? post.getUser().getUserId() : null,
                post.getTitle(),
                post.getContent(),
                post.getCategory(),
                post.getIcon(),
                post.getEventDate() != null ? post.getEventDate().toString() : null,
                post.getCreatedAt() != null ? post.getCreatedAt().toString() : null,
                Boolean.TRUE.equals(post.getPinned()),
                participantCount,
                attending,
                comments
        );
    }

    private CommentResponse toCommentResponse(Comment comment) {
        String authorName = comment.getUser() == null
                ? "Ukendt bruger"
                : comment.getUser().getFirstName() + " " + comment.getUser().getLastName();

        return new CommentResponse(
                comment.getCommentId(),
                comment.getUser() != null ? comment.getUser().getUserId() : null,
                authorName,
                comment.getContent(),
                comment.getCreatedAt() != null ? comment.getCreatedAt().toString() : null
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
