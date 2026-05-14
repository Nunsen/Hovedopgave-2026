package com.example.hovedopgave.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "group_members")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class GroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "group_member_id")
    private Integer groupMemberId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id")
    @JsonIgnoreProperties({"members", "messages", "createdBy"})
    private CommunityGroup group;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({
            "activationCodes", "bookings", "posts", "comments",
            "createdGroups", "groupMembers", "groupMessages"
    })
    private User user;

    @Column(name = "role_in_group", nullable = false)
    private String roleInGroup;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "is_hidden", nullable = false)
    private Boolean isHidden = false;

    @Column(name = "hidden_at")
    private LocalDateTime hiddenAt;
}
