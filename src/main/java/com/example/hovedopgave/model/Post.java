package com.example.hovedopgave.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "posts")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "post_id")
    private Integer postId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({
            "activationCodes", "bookings", "posts", "comments",
            "createdGroups", "groupMembers", "groupMessages"
    })
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_important", nullable = false)
    private Boolean isImportant;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String icon;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "post")
    @JsonIgnoreProperties({"post", "user"})
    private List<Comment> comments = new ArrayList<>();

    public Boolean getPinned() {
        return isImportant;
    }
}