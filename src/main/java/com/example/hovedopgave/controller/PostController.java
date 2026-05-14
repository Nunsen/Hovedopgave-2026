package com.example.hovedopgave.controller;

import com.example.hovedopgave.dto.*;
import com.example.hovedopgave.service.PostService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
public class PostController {
    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public List<PostResponse> getPosts() {
        return postService.getPosts();
    }

    @GetMapping("/{postId}")
    public PostResponse getPostById(
            @PathVariable Integer postId,
            @RequestParam(required = false) Integer userId
    ) {
        return postService.getPostById(postId, userId);
    }

    @PostMapping
    public ResponseEntity<PostResponse> createPost(@RequestBody PostCreateRequest request) {
        PostResponse response = postService.createPost(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{postId}")
    public ResponseEntity<PostResponse> updatePost(
            @PathVariable Integer postId,
            @RequestBody PostCreateRequest request
    ) {
        PostResponse response = postService.updatePost(postId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Integer postId,
            @RequestParam Integer userId
    ) {
        postService.deletePost(postId, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<PostResponse> createComment(
            @PathVariable Integer postId,
            @RequestBody CommentCreateRequest request
    ) {
        PostResponse response = postService.createComment(postId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{postId}/participation")
    public ResponseEntity<PostResponse> updateParticipation(
            @PathVariable Integer postId,
            @RequestBody PostParticipationRequest request
    ) {
        PostResponse response = postService.updateParticipation(postId, request);
        return ResponseEntity.ok(response);
    }

    @ExceptionHandler(PostService.PostValidationException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationException(
            PostService.PostValidationException exception
    ) {
        ValidationErrorResponse response = new ValidationErrorResponse(exception.getMessage(), exception.getFieldErrors());
        return ResponseEntity.badRequest().body(response);
    }
}
