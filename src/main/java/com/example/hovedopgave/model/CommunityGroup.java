package com.example.hovedopgave.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "resident_groups")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CommunityGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "group_id")
    private Integer groupId;

    @Column(name = "group_name")
    private String groupName;

    @Column(name = "name")
    private String legacyName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String type;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_user_id")
    @JsonIgnoreProperties({
            "activationCodes", "bookings", "posts", "comments",
            "createdGroups", "groupMembers", "groupMessages"
    })
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "group")
    @JsonIgnoreProperties({"group", "user"})
    private List<GroupMember> members = new ArrayList<>();

    @OneToMany(mappedBy = "group")
    @JsonIgnoreProperties({"group", "user"})
    private List<GroupMessage> messages = new ArrayList<>();

    public String getName() {
        return groupName != null ? groupName : legacyName;
    }

    public void setName(String name) {
        this.groupName = name;
        this.legacyName = name;
    }

    @PrePersist
    @PreUpdate
    void syncGroupNameColumns() {
        if (groupName == null && legacyName != null) {
            groupName = legacyName;
        }

        if (legacyName == null && groupName != null) {
            legacyName = groupName;
        }
    }
}
