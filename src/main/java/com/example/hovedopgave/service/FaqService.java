package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.FaqResponse;
import com.example.hovedopgave.model.Faq;
import com.example.hovedopgave.repository.FaqRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FaqService {
    private static final String FAQ_KIND = "FAQ";

    private final FaqRepository faqRepository;

    public FaqService(FaqRepository faqRepository) {
        this.faqRepository = faqRepository;
    }

    public List<FaqResponse> getFaqs() {
        return faqRepository.findAllByKindOrderByCategoryAscQuestionAsc(FAQ_KIND).stream()
                .map(this::toResponse)
                .toList();
    }

    private FaqResponse toResponse(Faq faq) {
        return new FaqResponse(
                faq.getFaqId(),
                faq.getQuestion(),
                faq.getAnswer(),
                faq.getCategory()
        );
    }
}
