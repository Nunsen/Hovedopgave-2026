package com.example.hovedopgave.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(
        name = "post_participations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "user_id"})
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PostParticipation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "post_participation_id")
    private Integer postParticipationId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "post_id")
    @JsonIgnoreProperties({"participations", "comments", "user"})
    private Post post;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({
            "activationCodes", "bookings", "posts", "comments",
            "createdGroups", "groupMembers", "groupMessages"
    })
    private User user;

    @Column(name = "is_attending", nullable = false)
    private Boolean isAttending;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
